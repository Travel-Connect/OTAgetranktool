/**
 * Expedia VPS Worker
 *
 * VPS で動作するスタンドアロンのExpedia専用ワーカー。
 * DataDome の IP ベースブロックを回避するため、別IPからアクセスする。
 *
 * 動作:
 * 1. Supabase の job_tasks テーブルから ota='expedia' & status='queued' のタスクをポーリング
 * 2. jobs → project_default_presets → ota_search_profiles / hotel_ota_mappings を参照してURL構築
 * 3. Playwright + StealthPlugin でページにアクセス & 抽出
 * 4. 結果を task_results テーブルに書き込み
 *
 * 使用方法:
 *   SUPABASE_URL=xxx SUPABASE_KEY=xxx node expedia-worker.mjs
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
const MAX_SHOW_MORE_CLICKS = 10;
const MAX_NATURAL_RANK = 200;
const MAX_RETRIES = 3;

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

// ── URL Builder (Expedia) ──
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

function buildExpediaUrl(task, baseUrl) {
  const checkout = calcCheckoutDate(task.checkin_date, task.nights);
  const totalAdults = task.adults_per_room * task.rooms;
  return mergeUrlParams(baseUrl, {
    startDate: task.checkin_date,
    endDate: checkout,
    d1: task.checkin_date,
    d2: checkout,
    adults: totalAdults,
    rooms: task.rooms,
  });
}

// ── URL正規化 & マッチ ──
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

function urlMatch(extracted, registered) {
  const normalize = (s) => {
    try { const url = new URL(s); return `${url.hostname}${url.pathname.replace(/\/+$/, "")}`.toLowerCase(); }
    catch { return s.toLowerCase().replace(/\/+$/, ""); }
  };
  return normalize(extracted) === normalize(registered);
}

// ── 順位計算 ──
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

// ── ブロック検出 ──
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

// ── Expedia ページ抽出 ──
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

  for (let clickNum = 0; clickNum < MAX_SHOW_MORE_CLICKS; clickNum++) {
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
      for (const h of card.querySelectorAll("h3")) {
        const text = h.textContent?.trim() || "";
        if (text.startsWith("Photo gallery for ")) { name = text.replace("Photo gallery for ", "").trim(); break; }
        if (!h.classList.contains("is-visually-hidden") && text.length > 2) { name = text; break; }
      }
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

// ── DB からタスク情報を解決 ──
async function resolveTaskContext(task) {
  // job → project_id, preset_id
  const { data: job } = await db.from("jobs").select("project_id, preset_id").eq("id", task.job_id).single();
  if (!job) throw new Error(`Job not found: ${task.job_id}`);

  // preset → area_label, hotel_ids
  let areaLabel = null, hotelIds = [];
  if (job.preset_id) {
    const { data: preset } = await db.from("project_default_presets").select("area_label, hotel_ids").eq("id", job.preset_id).single();
    if (preset) { areaLabel = preset.area_label || null; hotelIds = preset.hotel_ids || []; }
  }

  // search profile (expedia, area_label)
  let profileQuery = db.from("ota_search_profiles").select("*").eq("project_id", job.project_id).eq("ota", "expedia").eq("enabled", true);
  if (areaLabel) profileQuery = profileQuery.eq("area_label", areaLabel);
  const { data: profiles } = await profileQuery;
  const profile = profiles?.[0];
  if (!profile) throw new Error(`No Expedia search profile for area: ${areaLabel}`);

  // URL構築
  const searchUrl = buildExpediaUrl(task, profile.base_url);

  // hotel_ids がプリセットにない場合、project_hotels から取得
  if (hotelIds.length === 0) {
    const { data: hotelLinks } = await db.from("project_hotels").select("hotel_id").eq("project_id", job.project_id);
    hotelIds = (hotelLinks ?? []).map((h) => h.hotel_id);
  }

  // hotel_ota_mappings (expedia)
  const { data: mappings } = await db.from("hotel_ota_mappings").select("hotel_id, ota_property_url").eq("ota", "expedia").eq("enabled", true).in("hotel_id", hotelIds);
  const hotelUrlMap = new Map();
  for (const m of mappings ?? []) {
    const urls = hotelUrlMap.get(m.hotel_id) || [];
    urls.push(m.ota_property_url);
    hotelUrlMap.set(m.hotel_id, urls);
  }

  return { searchUrl, hotelUrlMap };
}

// ── タスク実行 ──
async function executeTask(searchUrl, hotelUrlMap) {
  const profile = getProfile();
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent: profile.userAgent, viewport: profile.viewport, locale: profile.locale,
    timezoneId: "Asia/Tokyo", extraHTTPHeaders: { "Accept-Language": "ja,en-US;q=0.9,en;q=0.8" },
  });
  try {
    const page = await context.newPage();
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT });

    const blocked = await detectBlock(page);
    if (blocked) return { success: false, errorCode: "blocked", errorMessage: `Blocked: ${blocked}` };

    const extraction = await extractExpediaPage(page);
    if (extraction.items.length === 0) return { success: false, errorCode: "empty", errorMessage: "No items extracted" };

    const rankResult = calculateNaturalRanks(extraction.items, hotelUrlMap);
    return { success: true, totalCountInt: extraction.totalCount, totalCountRawText: extraction.totalCountRawText, rankResult };
  } finally {
    await context.close().catch(() => {});
  }
}

// ── メインループ ──
async function pollAndExecute() {
  console.log(`[${new Date().toISOString()}] Polling for Expedia tasks...`);

  const { data: tasks, error } = await db.from("job_tasks").select("*").eq("ota", "expedia").eq("status", "queued").order("created_at", { ascending: true }).limit(1);
  if (error) { console.error("Poll error:", error.message); return; }
  if (!tasks || tasks.length === 0) return;

  const task = tasks[0];
  console.log(`[${new Date().toISOString()}] Found task: ${task.id} (job: ${task.job_id})`);

  // CAS: queued → running
  const { error: claimError } = await db.from("job_tasks").update({ status: "running", started_at: new Date().toISOString() }).eq("id", task.id).eq("status", "queued");
  if (claimError) { console.error("Claim error:", claimError.message); return; }

  try {
    const { searchUrl, hotelUrlMap } = await resolveTaskContext(task);
    console.log(`[${new Date().toISOString()}] URL: ${searchUrl}`);
    console.log(`[${new Date().toISOString()}] Hotels: ${[...hotelUrlMap.keys()].join(", ")}`);

    // 実行URL記録
    await db.from("job_tasks").update({ executed_url: searchUrl }).eq("id", task.id);

    const result = await Promise.race([
      executeTask(searchUrl, hotelUrlMap),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Task timeout (5 min)")), 300_000)),
    ]);

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
      console.log(`[${new Date().toISOString()}] SUCCESS: ranks=${JSON.stringify(result.rankResult.ranks)}, scanned=${result.rankResult.scannedNaturalCount}`);
    } else {
      const attemptCount = (task.attempt_count ?? 0) + 1;
      const status = attemptCount < MAX_RETRIES ? "queued" : "failed";
      await db.from("job_tasks").update({ status, attempt_count: attemptCount, last_error_code: result.errorCode, last_error_message: result.errorMessage, finished_at: new Date().toISOString() }).eq("id", task.id);
      console.log(`[${new Date().toISOString()}] ${status === "queued" ? "RETRY" : "FAILED"} (${attemptCount}/${MAX_RETRIES}): ${result.errorMessage}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const attemptCount = (task.attempt_count ?? 0) + 1;
    await db.from("job_tasks").update({ status: attemptCount < MAX_RETRIES ? "queued" : "failed", attempt_count: attemptCount, last_error_code: "execution_error", last_error_message: msg, finished_at: new Date().toISOString() }).eq("id", task.id);
    console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);
  }
}

// ── 起動 ──
async function main() {
  console.log("=== Expedia VPS Worker ===");
  console.log(`Supabase: ${SUPABASE_URL}`);
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
