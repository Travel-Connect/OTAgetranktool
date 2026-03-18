/**
 * VPS Multi-OTA Worker
 *
 * VPS ([VPS-IP-REDACTED]) で動作する Booking.com ワーカー。
 * - Booking.com: クリーンIPで正確な順位取得
 * - Expedia: コード残存するが現在無効化（DataDome IPブロック）
 *
 * ポーリング: claimed_by='vps' のタスクを10秒間隔で取得
 * OTA間インターリーブ + OTA別クールダウンで安定取得
 *
 * 使用方法:
 *   SUPABASE_URL=xxx SUPABASE_KEY=xxx node vps-worker.mjs
 *
 * ⚠ 重複コード注意:
 *   以下の関数はメインコードベースからの複製。修正時は両方を同期すること:
 *   - normalizeBookingUrl()  ← apps/web/src/lib/worker/extractors/booking.ts
 *   - calculateNaturalRanks() ← apps/web/src/lib/worker/rank-calculator.ts
 *   - urlMatch()              ← apps/web/src/lib/worker/rank-calculator.ts
 *   - detectBlock()           ← apps/web/src/lib/worker/block-detector.ts
 *   - extractBooking()        ← apps/web/src/lib/worker/extractors/booking.ts
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { createClient } from "@supabase/supabase-js";

// ── 設定 ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SCHEMA = "ota_getrank";
const POLL_INTERVAL = 10_000;
const NAVIGATION_TIMEOUT = 30_000;
const MAX_NATURAL_RANK = 200;
const MAX_RETRIES = 3;

// OTA別クールダウン (ms)
const OTA_COOLDOWN = {
  expedia: 300_000,  // 5分 — DataDome IP回復時間
  booking: 20_000,   // 20秒
};

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_KEY env vars required");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: SCHEMA },
  auth: { persistSession: false },
});

chromium.use(StealthPlugin());

// ── UA Pool ──
const UA_POOL = [
  { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", viewport: { width: 1920, height: 1080 }, locale: "ja-JP" },
  { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15", viewport: { width: 1440, height: 900 }, locale: "ja-JP" },
  { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0", viewport: { width: 1366, height: 768 }, locale: "ja-JP" },
];
let uaIndex = 0;
function getProfile() { return UA_POOL[uaIndex++ % UA_POOL.length]; }

let browser = null;
async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
  }
  return browser;
}

// ══════════════════════════════════════════════
// 共通ユーティリティ
// ══════════════════════════════════════════════

function calcCheckoutDate(checkinDate, nights) {
  const [y, m, d] = checkinDate.split("-").map(Number);
  const date = new Date(y, m - 1, d + nights);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mergeUrlParams(baseUrl, overrides) {
  const parsed = new URL(baseUrl);
  const params = new URLSearchParams(parsed.search);
  for (const [key, value] of Object.entries(overrides)) params.set(key, String(value));
  parsed.search = params.toString();
  return parsed.toString();
}

function urlMatch(extracted, registered) {
  const normalize = (s) => {
    try { const url = new URL(s); return `${url.hostname}${url.pathname.replace(/\/+$/, "")}`.toLowerCase(); }
    catch { return s.toLowerCase().replace(/\/+$/, ""); }
  };
  return normalize(extracted) === normalize(registered);
}

function calculateNaturalRanks(allItems, hotelUrlMap) {
  const ranks = {}, displayRanks = {}, debugSample = [];
  for (const hotelId of hotelUrlMap.keys()) { ranks[hotelId] = null; displayRanks[hotelId] = null; }
  let naturalRank = 0, displayRank = 0;
  for (const item of allItems) {
    displayRank++;
    for (const [hotelId, urls] of hotelUrlMap) {
      if (displayRanks[hotelId] !== null) continue;
      if (urls.some((u) => urlMatch(item.propertyUrl, u))) displayRanks[hotelId] = displayRank;
    }
    if (!item.isAd) {
      naturalRank++;
      for (const [hotelId, urls] of hotelUrlMap) {
        if (ranks[hotelId] !== null) continue;
        if (urls.some((u) => urlMatch(item.propertyUrl, u))) ranks[hotelId] = naturalRank;
      }
    }
    if (debugSample.length < 5) debugSample.push({ name: item.name, url: item.propertyUrl, naturalRank: item.isAd ? 0 : naturalRank, displayRank, isAd: item.isAd });
    if (naturalRank >= MAX_NATURAL_RANK) break;
  }
  return { ranks, displayRanks, scannedNaturalCount: Math.min(naturalRank, MAX_NATURAL_RANK), scannedDisplayCount: displayRank, debugItemsSample: debugSample };
}

async function detectBlock(page) {
  for (const { selector, label } of [
    { selector: '[class*="captcha"], [id*="captcha"]', label: "CAPTCHA" },
    { selector: '[class*="challenge"], [id*="challenge"]', label: "Challenge" },
    { selector: 'iframe[src*="captcha"]', label: "CAPTCHA iframe" },
  ]) {
    if ((await page.locator(selector).count()) > 0) return label;
  }
  const title = await page.title();
  if (/access denied|blocked|security check/i.test(title)) return `Title: ${title}`;
  return null;
}

// ══════════════════════════════════════════════
// Expedia Extractor
// ══════════════════════════════════════════════

function normalizeExpediaUrl(hotelIdOrHref) {
  if (/^\d+$/.test(hotelIdOrHref)) return `https://www.expedia.co.jp/.h${hotelIdOrHref}.`;
  try {
    const url = new URL(hotelIdOrHref, "https://www.expedia.co.jp");
    const match = url.pathname.match(/\.h(\d+)\./);
    if (match) return `https://www.expedia.co.jp/.h${match[1]}.`;
    const hotelIdParam = url.searchParams.get("hotelId");
    if (hotelIdParam) return `https://www.expedia.co.jp/.h${hotelIdParam}.`;
    return `${url.origin}${url.pathname}`;
  } catch { return hotelIdOrHref; }
}

function buildExpediaUrl(task, baseUrl) {
  const checkout = calcCheckoutDate(task.checkin_date, task.nights);
  return mergeUrlParams(baseUrl, {
    startDate: task.checkin_date, endDate: checkout,
    d1: task.checkin_date, d2: checkout,
    adults: task.adults_per_room * task.rooms, rooms: task.rooms,
  });
}

async function extractExpediaPage(page) {
  await page.waitForSelector('[data-stid="lodging-card-responsive"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const initialCount = await page.locator('[data-stid="lodging-card-responsive"]').count();
  if (initialCount === 0) return { totalCount: null, totalCountRawText: null, items: [] };

  const { totalCount, totalCountRawText } = await page.evaluate(() => {
    const headerMsg = document.querySelector('[data-stid="results-header-message"]');
    if (headerMsg) { const text = (headerMsg.textContent || "").trim(); const m = text.match(/(\d[\d,]*)\+?\s*/); if (m) return { totalCount: parseInt(m[1].replace(/,/g, ""), 10) || null, totalCountRawText: text }; }
    const bodyText = document.body.textContent || "";
    const countMatch = bodyText.match(/(\d[\d,]*)\+?\s*[Pp]roperties/);
    if (countMatch) return { totalCount: parseInt(countMatch[1].replace(/,/g, ""), 10) || null, totalCountRawText: countMatch[0].trim() };
    const jaMatch = bodyText.match(/(\d[\d,]*)\s*軒/);
    if (jaMatch) return { totalCount: parseInt(jaMatch[1].replace(/,/g, ""), 10) || null, totalCountRawText: jaMatch[0].trim() };
    return { totalCount: null, totalCountRawText: null };
  });

  // Show more ボタンクリック
  for (let clickNum = 0; clickNum < 10; clickNum++) {
    const currentCount = await page.locator('[data-stid="lodging-card-responsive"]').count();
    if (currentCount >= 200) break;
    const clicked = await page.evaluate(() => {
      for (const btn of document.querySelectorAll("button")) {
        const text = (btn.textContent || "").trim();
        if (text === "Show more" || text === "さらに表示" || text === "もっと見る") { btn.click(); return true; }
      }
      return false;
    });
    if (!clicked) break;
    await page.waitForTimeout(3000);
    for (let s = 0; s < 10; s++) { await page.evaluate(() => window.scrollBy(0, 800)); await page.waitForTimeout(1000); }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const extracted = await page.evaluate(() => {
    const items = [];
    for (const card of document.querySelectorAll('[data-stid="lodging-card-responsive"]')) {
      let hotelId = null;
      const links = card.querySelectorAll("a");
      for (const link of links) { const href = link.getAttribute("href") || ""; const idMatch = href.match(/\.h(\d+)\./); if (idMatch) { hotelId = idMatch[1]; break; } }
      if (!hotelId) continue;
      let name = null;
      for (const h of card.querySelectorAll("h3")) { const text = h.textContent?.trim() || ""; if (text.startsWith("Photo gallery for ")) { name = text.replace("Photo gallery for ", "").trim(); break; } if (!h.classList.contains("is-visually-hidden") && text.length > 2) { name = text; break; } }
      if (!name) for (const link of links) { const href = link.getAttribute("href") || ""; if (!href.includes(".h" + hotelId + ".")) continue; const text = link.textContent?.trim() || ""; let m = text.match(/More information about (.+?),?\s*opens in/i); if (m) { name = m[1].trim(); break; } m = text.match(/Opens (.+?) in new tab/i); if (m) { name = m[1].trim(); break; } }
      if (!name) for (const link of links) { const href = link.getAttribute("href") || ""; const pathMatch = href.match(/-Hotels-(.+?)\.h\d+\./); if (pathMatch) { name = pathMatch[1].replace(/-/g, " "); break; } }
      let isAd = false;
      for (const badge of card.querySelectorAll("span.uitk-badge, [class*='uitk-badge']")) { const t = badge.textContent?.trim(); if (t === "Ad" || t === "広告" || t === "Sponsored") { isAd = true; break; } }
      if (!isAd) { let el = card; for (let i = 0; i < 3; i++) { el = el?.parentElement ?? null; if (!el) break; if ((el.getAttribute("data-stid") || "").includes("sponsored")) { isAd = true; break; } } }
      items.push({ hotelId, name, isAd });
    }
    return items;
  });

  return {
    totalCount, totalCountRawText,
    items: extracted.map((item) => ({ propertyUrl: normalizeExpediaUrl(item.hotelId), propertyId: item.hotelId, name: item.name ?? undefined, isAd: item.isAd })),
  };
}

// ══════════════════════════════════════════════
// Booking.com Extractor
// ══════════════════════════════════════════════

function normalizeBookingUrl(href) {
  try { const url = new URL(href, "https://www.booking.com"); return `${url.origin}${url.pathname}`; }
  catch { return href; }
}

function buildBookingUrl(task, baseUrl) {
  const checkout = calcCheckoutDate(task.checkin_date, task.nights);
  return mergeUrlParams(baseUrl, {
    checkin: task.checkin_date, checkout,
    group_adults: task.adults_per_room * task.rooms,
    group_children: 0, no_rooms: task.rooms,
  });
}

async function bookingWarmUp(page) {
  await page.goto("https://www.booking.com/?lang=ja", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  await page.evaluate(() => {
    const btn = document.querySelector("#onetrust-accept-btn-handler");
    if (btn) btn.click();
  });
  await page.waitForTimeout(2000);
}

async function dismissGeniusModal(page) {
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label="ログイン画面を閉じる。"]');
    if (closeBtn) closeBtn.click();
  });
}

async function extractBookingPage(page) {
  await page.waitForSelector('[data-testid="property-card"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await dismissGeniusModal(page);

  // 総件数
  const { totalCount, totalCountRawText } = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const h1Text = h1?.textContent?.trim() ?? "";
    const m = h1Text.match(/(\d[\d,]*)\s*軒/);
    if (m) return { totalCount: parseInt(m[1].replace(/,/g, ""), 10) || null, totalCountRawText: m[0] };
    const bodyText = document.body.innerText;
    const bm = bodyText.match(/(\d[\d,]*)\s*軒/);
    if (bm) return { totalCount: parseInt(bm[1].replace(/,/g, ""), 10) || null, totalCountRawText: bm[0] };
    return { totalCount: null, totalCountRawText: null };
  });

  // Phase 1: 無限スクロール
  let prevScrollCount = 0;
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    await dismissGeniusModal(page);
    const count = await page.locator('[data-testid="property-card"]').count();
    if (count === prevScrollCount && i > 0) break;
    prevScrollCount = count;
  }

  // Phase 2: 「検索結果をさらに読み込む」ボタン
  for (let click = 0; click < 15; click++) {
    const currentCount = await page.locator('[data-testid="property-card"]').count();
    if (currentCount >= 200) break;
    const clicked = await page.evaluate(() => {
      for (const btn of document.querySelectorAll("button")) {
        if (btn.textContent?.includes("検索結果をさらに読み込む")) { btn.click(); return true; }
      }
      return false;
    });
    if (!clicked) break;
    await page.waitForTimeout(3000);
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
      await dismissGeniusModal(page);
    }
  }

  // カード抽出
  const pageItems = await page.evaluate(() => {
    const items = [];
    for (const card of document.querySelectorAll('[data-testid="property-card"]')) {
      const titleLink = card.querySelector('[data-testid="title-link"]');
      const href = titleLink?.getAttribute("href");
      if (!href) continue;
      const name = card.querySelector('[data-testid="title"]')?.textContent?.trim() ?? null;
      let isAd = false;
      if (card.querySelector('[data-testid="ad-badge"]')) isAd = true;
      if (!isAd) for (const span of card.querySelectorAll("span")) { const t = span.textContent?.trim(); if (t === "広告" || t === "Ad" || t === "Sponsored" || t === "スポンサー") { isAd = true; break; } }
      items.push({ href, name, isAd });
    }
    return items;
  });

  return {
    totalCount, totalCountRawText,
    items: (pageItems || []).map((item) => ({ propertyUrl: normalizeBookingUrl(item.href), name: item.name ?? undefined, isAd: item.isAd })),
  };
}

// ══════════════════════════════════════════════
// OTA ディスパッチ
// ══════════════════════════════════════════════

const OTA_CONFIG = {
  expedia: {
    buildUrl: buildExpediaUrl,
    extract: async (page) => extractExpediaPage(page),
    warmUp: null,
    waitUntil: "domcontentloaded",
    normalizeUrl: normalizeExpediaUrl,
  },
  booking: {
    buildUrl: buildBookingUrl,
    extract: async (page) => extractBookingPage(page),
    warmUp: bookingWarmUp,
    waitUntil: "networkidle",
    normalizeUrl: normalizeBookingUrl,
  },
};

// ══════════════════════════════════════════════
// DB からタスク情報を解決
// ══════════════════════════════════════════════

async function resolveTaskContext(task) {
  const config = OTA_CONFIG[task.ota];
  if (!config) throw new Error(`Unsupported OTA: ${task.ota}`);

  const { data: job } = await db.from("jobs").select("project_id, preset_id").eq("id", task.job_id).single();
  if (!job) throw new Error(`Job not found: ${task.job_id}`);

  let areaLabel = null, hotelIds = [];
  if (job.preset_id) {
    const { data: preset } = await db.from("project_default_presets").select("area_label, hotel_ids").eq("id", job.preset_id).single();
    if (preset) { areaLabel = preset.area_label || null; hotelIds = preset.hotel_ids || []; }
  }

  let profileQuery = db.from("ota_search_profiles").select("*").eq("project_id", job.project_id).eq("ota", task.ota).eq("enabled", true);
  if (areaLabel) profileQuery = profileQuery.eq("area_label", areaLabel);
  const { data: profiles } = await profileQuery;
  const profile = profiles?.[0];
  if (!profile) throw new Error(`No ${task.ota} search profile for area: ${areaLabel}`);

  const searchUrl = config.buildUrl(task, profile.base_url);

  if (hotelIds.length === 0) {
    const { data: hotelLinks } = await db.from("project_hotels").select("hotel_id").eq("project_id", job.project_id);
    hotelIds = (hotelLinks ?? []).map((h) => h.hotel_id);
  }

  const { data: mappings } = await db.from("hotel_ota_mappings").select("hotel_id, ota_property_url").eq("ota", task.ota).eq("enabled", true).in("hotel_id", hotelIds);
  const hotelUrlMap = new Map();
  for (const m of mappings ?? []) {
    const urls = hotelUrlMap.get(m.hotel_id) || [];
    // 登録URLをOTA別の正規化関数で変換（抽出URLと同じ形式に統一）
    const normalizedUrl = config.normalizeUrl ? config.normalizeUrl(m.ota_property_url) : m.ota_property_url;
    urls.push(normalizedUrl);
    hotelUrlMap.set(m.hotel_id, urls);
  }

  return { searchUrl, hotelUrlMap, config };
}

// ══════════════════════════════════════════════
// タスク実行
// ══════════════════════════════════════════════

async function executeTask(searchUrl, hotelUrlMap, config) {
  const profile = getProfile();
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent: profile.userAgent, viewport: profile.viewport, locale: profile.locale,
    timezoneId: "Asia/Tokyo", extraHTTPHeaders: { "Accept-Language": "ja,en-US;q=0.9,en;q=0.8" },
  });
  try {
    const page = await context.newPage();

    // OTA固有ウォームアップ
    if (config.warmUp) await config.warmUp(page);

    await page.goto(searchUrl, { waitUntil: config.waitUntil, timeout: NAVIGATION_TIMEOUT });

    const blocked = await detectBlock(page);
    if (blocked) return { success: false, errorCode: "blocked", errorMessage: `Blocked: ${blocked}` };

    const extraction = await config.extract(page);
    if (extraction.items.length === 0) return { success: false, errorCode: "empty", errorMessage: "No items extracted" };

    const rankResult = calculateNaturalRanks(extraction.items, hotelUrlMap);
    return { success: true, totalCountInt: extraction.totalCount, totalCountRawText: extraction.totalCountRawText, rankResult };
  } finally {
    await context.close().catch(() => {});
  }
}

// ══════════════════════════════════════════════
// OTA別クールダウン追跡
// ══════════════════════════════════════════════

const lastExecutedByOta = new Map(); // ota → timestamp

function getCooldownRemaining(ota) {
  const lastTime = lastExecutedByOta.get(ota);
  if (!lastTime) return 0;
  const cooldown = OTA_COOLDOWN[ota] ?? 10_000;
  const elapsed = Date.now() - lastTime;
  return Math.max(0, cooldown - elapsed);
}

// ══════════════════════════════════════════════
// メインループ
// ══════════════════════════════════════════════

async function pollAndExecute() {
  // claimed_by='vps' または未設定の queued タスクを OTA ごとに取得
  const allTasks = [];
  for (const ota of ["booking"]) {
    const { data, error: e } = await db
      .from("job_tasks")
      .select("*")
      .eq("ota", ota)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(5);
    if (e) { console.error(`Poll error (${ota}):`, e.message); continue; }
    if (data) allTasks.push(...data);
  }

  if (allTasks.length === 0) return;

  // claimed_by='vps' のタスクのみ取得（ローカル用タスクを奪わない）
  const vpsTasks = allTasks.filter((t) => t.claimed_by === "vps");
  if (vpsTasks.length === 0) return;

  // クールダウン中でないタスクを選択（OTAインターリーブ）
  let selectedTask = null;
  for (const task of vpsTasks) {
    const remaining = getCooldownRemaining(task.ota);
    if (remaining <= 0) { selectedTask = task; break; }
  }

  // 全タスクがクールダウン中の場合、ポーリングに戻る（ブロックしない）
  if (!selectedTask) {
    const minWait = Math.min(...vpsTasks.map((t) => getCooldownRemaining(t.ota)));
    console.log(`[cooldown] All OTAs cooling down. Next ready in ${Math.round(minWait / 1000)}s. Returning to poll loop.`);
    return;
  }

  if (!selectedTask) return;

  const task = selectedTask;
  console.log(`[${new Date().toISOString()}] Found ${task.ota} task: ${task.id}`);

  // CAS: queued → running
  const { error: claimError } = await db
    .from("job_tasks")
    .update({ status: "running", started_at: new Date().toISOString(), claimed_by: "vps" })
    .eq("id", task.id)
    .eq("status", "queued");
  if (claimError) { console.error("Claim error:", claimError.message); return; }

  try {
    const { searchUrl, hotelUrlMap, config } = await resolveTaskContext(task);
    console.log(`[${new Date().toISOString()}] ${task.ota} URL: ${searchUrl}`);

    await db.from("job_tasks").update({ executed_url: searchUrl }).eq("id", task.id);

    const result = await Promise.race([
      executeTask(searchUrl, hotelUrlMap, config),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Task timeout (5 min)")), 300_000)),
    ]);

    // クールダウン記録
    lastExecutedByOta.set(task.ota, Date.now());

    if (result.success) {
      await db.from("job_tasks").update({ status: "success", finished_at: new Date().toISOString() }).eq("id", task.id);
      await db.from("task_results").upsert({
        task_id: task.id,
        total_count_int: result.totalCountInt,
        total_count_raw_text: result.totalCountRawText,
        ranks_json: result.rankResult.ranks,
        display_ranks_json: result.rankResult.displayRanks,
        scanned_natural_count: result.rankResult.scannedNaturalCount,
        debug_items_sample_json: result.rankResult.debugItemsSample,
        pagination_hints_json: null,
      });
      console.log(`[${new Date().toISOString()}] ${task.ota} SUCCESS: ranks=${JSON.stringify(result.rankResult.ranks)}, scanned=${result.rankResult.scannedNaturalCount}`);
    } else {
      const attemptCount = (task.attempt_count ?? 0) + 1;
      const status = attemptCount < MAX_RETRIES ? "queued" : "failed";
      await db.from("job_tasks").update({ status, attempt_count: attemptCount, last_error_code: result.errorCode, last_error_message: result.errorMessage, finished_at: new Date().toISOString() }).eq("id", task.id);
      console.log(`[${new Date().toISOString()}] ${task.ota} ${status === "queued" ? "RETRY" : "FAILED"} (${attemptCount}/${MAX_RETRIES}): ${result.errorMessage}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lastExecutedByOta.set(task.ota, Date.now());
    const attemptCount = (task.attempt_count ?? 0) + 1;
    await db.from("job_tasks").update({ status: attemptCount < MAX_RETRIES ? "queued" : "failed", attempt_count: attemptCount, last_error_code: "execution_error", last_error_message: msg, finished_at: new Date().toISOString() }).eq("id", task.id);
    console.error(`[${new Date().toISOString()}] ${task.ota} ERROR: ${msg}`);
  }
}

// ══════════════════════════════════════════════
// 起動
// ══════════════════════════════════════════════

async function main() {
  console.log("=== VPS Multi-OTA Worker ===");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`OTAs: expedia (cooldown ${OTA_COOLDOWN.expedia / 1000}s), booking (cooldown ${OTA_COOLDOWN.booking / 1000}s)`);
  console.log(`Polling interval: ${POLL_INTERVAL / 1000}s`);
  await getBrowser();
  console.log("Browser ready (Chromium + StealthPlugin)");

  while (true) {
    try { await pollAndExecute(); } catch (err) { console.error("Unhandled error:", err); }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

process.on("SIGINT", async () => { console.log("\nShutting down..."); if (browser) await browser.close().catch(() => {}); process.exit(0); });
process.on("SIGTERM", async () => { console.log("\nShutting down..."); if (browser) await browser.close().catch(() => {}); process.exit(0); });

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
