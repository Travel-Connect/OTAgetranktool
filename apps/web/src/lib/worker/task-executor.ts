import type { Page } from "playwright";
import type { OtaType } from "@ota/shared";
import { OTA_EXTRACTORS } from "./extractors";
import { acquireWorkerContext, type WorkerContext } from "./browser-pool";
import { waitForDomain } from "./rate-limiter";
import { calculateNaturalRanks, urlMatch, generatePaginationHints, type RankResult } from "./rank-calculator";
import type { ListItem, OtaExtractor } from "./extractor-types";

/** 前回のヒント情報 */
export interface PaginationHint {
  /** hotel_id → { displayRank, pageNumber } */
  hotelPageMap: Record<string, { displayRank: number; pageNumber: number }>;
  /** 前回スキャンした表示件数 (スクロール型OTA用) */
  scannedCount: number;
}

/** タスク実行結果 */
export interface TaskExecutionResult {
  success: boolean;
  totalCountInt: number | null;
  totalCountRawText: string | null;
  rankResult: RankResult | null;
  executedUrl: string;
  errorCode?: string;
  errorMessage?: string;
  /** 失敗時の証跡 */
  screenshotBuffer?: Buffer;
  htmlContent?: string;
  /** 次回用ヒント */
  paginationHints?: Record<string, { displayRank: number; pageNumber: number }>;
  scannedCount?: number;
}

/** タスク入力 */
export interface TaskInput {
  ota: OtaType;
  url: string;
  /** hotel_id → [正規化済みOTA施設URL] */
  hotelUrlMap: Map<string, string[]>;
  /** 前回のヒント（スマートページネーション用） */
  paginationHint?: PaginationHint | null;
}

const NAVIGATION_TIMEOUT = 30000;
const MAX_PAGES = 10; // 最大10ページ探索 (30件/ページ × 10 = ~200件超)
const TASK_TIMEOUT = 300000; // タスク全体のタイムアウト (5分)

/**
 * 1タスクを実行: URLアクセス → 一覧抽出 → 自然順位算出
 * タスク全体にタイムアウトを設定してハングを防止
 */
export async function executeTask(input: TaskInput): Promise<TaskExecutionResult> {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      executeTaskInner(input),
      new Promise<TaskExecutionResult>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error("Task execution timeout (5 min)")),
          TASK_TIMEOUT,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

async function executeTaskInner(input: TaskInput): Promise<TaskExecutionResult> {
  const extractor = OTA_EXTRACTORS[input.ota];
  let worker: WorkerContext | null = null;

  try {
    worker = await acquireWorkerContext();
    const { page } = worker;

    // OTA固有のウォームアップ (Booking.com: トップページ訪問でクッキー取得)
    if (extractor.warmUp) {
      await extractor.warmUp(page);
    }

    // 速度制限
    await waitForDomain(input.url);

    const waitStrategy = extractor.waitUntil ?? "networkidle";
    const hint = input.paginationHint;
    const canSmartPaginate = hint && extractor.getPageUrl
      && Object.keys(hint.hotelPageMap).length > 0;

    let result: {
      allItems: ListItem[];
      totalCountInt: number | null;
      totalCountRawText: string | null;
    };

    if (canSmartPaginate) {
      // ── スマートページネーション ──
      result = await executeSmartPagination(page, extractor, input, hint!, waitStrategy);
    } else {
      // ── デフォルト: ページ1から順次スキャン ──
      // ナビゲーション
      await page.goto(input.url, {
        waitUntil: waitStrategy,
        timeout: NAVIGATION_TIMEOUT,
      });

      // CAPTCHA / ブロック検出
      const blocked = await detectBlock(page);
      if (blocked) {
        const artifacts = await captureArtifacts(page);
        return {
          success: false,
          totalCountInt: null,
          totalCountRawText: null,
          rankResult: null,
          executedUrl: input.url,
          errorCode: "blocked",
          errorMessage: `Blocked or CAPTCHA detected: ${blocked}`,
          ...artifacts,
        };
      }

      result = await executeDefaultPagination(page, extractor, input, waitStrategy);
    }

    // 自然順位算出
    const rankResult = calculateNaturalRanks(result.allItems, input.hotelUrlMap);

    // ヒント生成
    const itemsPerPage = extractor.itemsPerPage ?? 30;
    const paginationHints = generatePaginationHints(rankResult, itemsPerPage);

    return {
      success: true,
      totalCountInt: result.totalCountInt,
      totalCountRawText: result.totalCountRawText,
      rankResult,
      executedUrl: input.url,
      paginationHints,
      scannedCount: rankResult.scannedDisplayCount,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const code = categorizeError(msg);

    let artifacts: { screenshotBuffer?: Buffer; htmlContent?: string } = {};
    if (worker?.page) {
      artifacts = await captureArtifacts(worker.page);
    }

    return {
      success: false,
      totalCountInt: null,
      totalCountRawText: null,
      rankResult: null,
      executedUrl: input.url,
      errorCode: code,
      errorMessage: msg,
      ...artifacts,
    };
  } finally {
    if (worker) {
      await worker.release();
    }
  }
}

/**
 * スマートページネーション: ヒントを使ってターゲットページから探索開始
 * - 前回ホテルが見つかったページから開始
 * - 見つからなければ前後に拡大
 * - 全ホテル発見で早期終了
 */
async function executeSmartPagination(
  page: Page,
  extractor: OtaExtractor,
  input: TaskInput,
  hint: PaginationHint,
  waitStrategy: "domcontentloaded" | "load" | "networkidle",
): Promise<{ allItems: ListItem[]; totalCountInt: number | null; totalCountRawText: string | null }> {
  // ターゲットページを計算（ヒントに含まれるホテルのページ番号）
  const targetPages = new Set<number>();
  for (const [hotelId, h] of Object.entries(hint.hotelPageMap)) {
    if (input.hotelUrlMap.has(hotelId) && h.pageNumber >= 1 && h.pageNumber <= MAX_PAGES) {
      targetPages.add(h.pageNumber);
    }
  }

  // ページ走査順序: ターゲット → 前後に展開 → 残りを埋める
  const pageOrder = buildSmartPageOrder([...targetPages], MAX_PAGES);

  // ページごとのアイテムを収集（ページ番号タグ付き）
  const pageItems = new Map<number, ListItem[]>();
  const visitedPages = new Set<number>();
  let totalCountInt: number | null = null;
  let totalCountRawText: string | null = null;
  let firstNavDone = false;

  console.log(`[smart] ${input.ota}: page order = [${pageOrder.slice(0, 8).join(",")}...] (targets: [${[...targetPages].join(",")}])`);

  for (const pageNum of pageOrder) {
    if (visitedPages.has(pageNum)) continue;

    // ページURLを生成
    const pageUrl = pageNum === 1
      ? input.url
      : extractor.getPageUrl!(input.url, pageNum);

    // ナビゲーション
    await waitForDomain(pageUrl);
    await page.goto(pageUrl, {
      waitUntil: waitStrategy,
      timeout: NAVIGATION_TIMEOUT,
    });

    // 最初のページでブロック検出
    if (!firstNavDone) {
      firstNavDone = true;
      const blocked = await detectBlock(page);
      if (blocked) {
        throw new Error(`Blocked or CAPTCHA detected: ${blocked}`);
      }
    }

    // 抽出
    const extraction = await extractor.extractPage(page);
    visitedPages.add(pageNum);
    pageItems.set(pageNum, extraction.items);

    // 総件数（最初に取得できたものを使用）
    if (totalCountInt === null && extraction.totalCount !== null) {
      totalCountInt = extraction.totalCount;
      totalCountRawText = extraction.totalCountRawText;
    }

    // 空ページ = これ以上先にはデータなし → ただし他ページの走査は継続
    if (extraction.items.length === 0) {
      console.log(`[smart] ${input.ota}: page ${pageNum} empty, skipping`);
      continue;
    }

    // 全ホテル発見チェック（ページ順に並べ直してからチェック）
    const orderedItems = reconstructOrderedItems(pageItems);
    if (allHotelsFound(orderedItems, input.hotelUrlMap)) {
      console.log(`[smart] ${input.ota}: all hotels found after ${visitedPages.size} pages`);
      break;
    }

    // 自然順位200件到達チェック
    const naturalCount = orderedItems.filter((i) => !i.isAd).length;
    if (naturalCount >= 200) {
      break;
    }
  }

  // ── 順位確定フェーズ: 未取得ページを埋め戻し ──
  // page 1 〜 max(取得済みページ) の間に欠けたページがあれば取得し、
  // 絶対順位の正確性を保証する
  const maxVisited = Math.max(...visitedPages);
  for (let p = 1; p <= maxVisited; p++) {
    if (visitedPages.has(p)) continue;

    const pageUrl = p === 1 ? input.url : extractor.getPageUrl!(input.url, p);
    console.log(`[smart] ${input.ota}: backfilling page ${p} for rank accuracy`);

    await waitForDomain(pageUrl);
    await page.goto(pageUrl, {
      waitUntil: waitStrategy,
      timeout: NAVIGATION_TIMEOUT,
    });

    const extraction = await extractor.extractPage(page);
    visitedPages.add(p);
    pageItems.set(p, extraction.items);

    if (totalCountInt === null && extraction.totalCount !== null) {
      totalCountInt = extraction.totalCount;
      totalCountRawText = extraction.totalCountRawText;
    }
  }

  return {
    allItems: reconstructOrderedItems(pageItems),
    totalCountInt,
    totalCountRawText,
  };
}

/**
 * デフォルトページネーション: ページ1から順次スキャン（既存ロジック + 早期終了）
 */
async function executeDefaultPagination(
  page: Page,
  extractor: OtaExtractor,
  input: TaskInput,
  waitStrategy: "domcontentloaded" | "load" | "networkidle",
): Promise<{ allItems: ListItem[]; totalCountInt: number | null; totalCountRawText: string | null }> {
  const allItems: ListItem[] = [];
  let totalCountInt: number | null = null;
  let totalCountRawText: string | null = null;
  let currentUrl = input.url;

  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    const extraction = await extractor.extractPage(page);

    // 総件数は1ページ目のみ
    if (pageNum === 1) {
      totalCountInt = extraction.totalCount;
      totalCountRawText = extraction.totalCountRawText;
    }

    allItems.push(...extraction.items);

    // 自然順位200件分集まったか、次ページ無しなら終了
    const naturalCount = allItems.filter((i) => !i.isAd).length;
    if (naturalCount >= 200 || !extraction.hasNextPage || pageNum >= MAX_PAGES) {
      break;
    }

    // 全ホテル発見で早期終了（ページネーション型のみ）
    if (!extractor.isScrollBased && allHotelsFound(allItems, input.hotelUrlMap)) {
      console.log(`[default] ${input.ota}: all hotels found at page ${pageNum}, early stop`);
      break;
    }

    // 次ページへ
    currentUrl = extractor.getNextPageUrl(currentUrl, pageNum);
    await waitForDomain(currentUrl);
    await page.goto(currentUrl, {
      waitUntil: waitStrategy,
      timeout: NAVIGATION_TIMEOUT,
    });
  }

  return { allItems, totalCountInt, totalCountRawText };
}

/**
 * スマートページ順序: ターゲットページ → 前後展開 → 残り
 * 例: targets=[2,4], max=10 → [2, 4, 1, 3, 5, 6, 7, 8, 9, 10]
 */
function buildSmartPageOrder(targetPages: number[], maxPages: number): number[] {
  if (targetPages.length === 0) {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }

  const order: number[] = [];
  const seen = new Set<number>();

  // ターゲットページを先頭に
  for (const p of targetPages.sort((a, b) => a - b)) {
    if (p >= 1 && p <= maxPages && !seen.has(p)) {
      order.push(p);
      seen.add(p);
    }
  }

  // ターゲットの前後に展開
  for (let delta = 1; delta <= maxPages; delta++) {
    for (const target of targetPages) {
      for (const candidate of [target - delta, target + delta]) {
        if (candidate >= 1 && candidate <= maxPages && !seen.has(candidate)) {
          order.push(candidate);
          seen.add(candidate);
        }
      }
    }
  }

  return order;
}

/**
 * ページ番号順にアイテムを結合（正しい表示順序を再構成）
 */
function reconstructOrderedItems(pageItems: Map<number, ListItem[]>): ListItem[] {
  return [...pageItems.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, items]) => items);
}

/**
 * 全ホテルが見つかったかチェック
 */
function allHotelsFound(items: ListItem[], hotelUrlMap: Map<string, string[]>): boolean {
  for (const [, urls] of hotelUrlMap) {
    const found = items.some((item) =>
      urls.some((u) => urlMatch(item.propertyUrl, u)),
    );
    if (!found) return false;
  }
  return true;
}

/** CAPTCHA / ブロック検出 */
async function detectBlock(page: Page): Promise<string | null> {
  const indicators = [
    { selector: '[class*="captcha"], [id*="captcha"]', label: "CAPTCHA" },
    { selector: '[class*="challenge"], [id*="challenge"]', label: "Challenge" },
    { selector: 'iframe[src*="captcha"]', label: "CAPTCHA iframe" },
  ];

  for (const { selector, label } of indicators) {
    if ((await page.locator(selector).count()) > 0) {
      return label;
    }
  }

  // タイトルベースの検出
  const title = await page.title();
  if (/access denied|blocked|security check/i.test(title)) {
    return `Title indicates block: ${title}`;
  }

  return null;
}

/** 失敗時の証跡キャプチャ */
async function captureArtifacts(
  page: Page,
): Promise<{ screenshotBuffer?: Buffer; htmlContent?: string }> {
  let screenshotBuffer: Buffer | undefined;
  let htmlContent: string | undefined;

  try {
    screenshotBuffer = await page.screenshot({ fullPage: true });
  } catch {}

  try {
    htmlContent = await page.content();
  } catch {}

  return { screenshotBuffer, htmlContent };
}

/** エラー分類 */
function categorizeError(message: string): string {
  if (/timeout/i.test(message)) return "timeout";
  if (/navigation/i.test(message)) return "navigation";
  if (/net::/i.test(message)) return "network";
  return "parse_error";
}
