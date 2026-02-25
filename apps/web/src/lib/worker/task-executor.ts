import type { Page } from "playwright";
import type { OtaType } from "@ota/shared";
import { OTA_EXTRACTORS } from "./extractors";
import { acquireWorkerContext, type WorkerContext } from "./browser-pool";
import { waitForDomain } from "./rate-limiter";
import { calculateNaturalRanks, type RankResult } from "./rank-calculator";
import type { ListItem } from "./extractor-types";

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
}

/** タスク入力 */
export interface TaskInput {
  ota: OtaType;
  url: string;
  /** hotel_id → [正規化済みOTA施設URL] */
  hotelUrlMap: Map<string, string[]>;
}

const NAVIGATION_TIMEOUT = 30000;
const MAX_PAGES = 5; // 最大5ページ探索 (20件/ページ × 5 = 100件)

/**
 * 1タスクを実行: URLアクセス → 一覧抽出 → 自然順位算出
 */
export async function executeTask(input: TaskInput): Promise<TaskExecutionResult> {
  const extractor = OTA_EXTRACTORS[input.ota];
  let worker: WorkerContext | null = null;

  try {
    worker = await acquireWorkerContext();
    const { page } = worker;

    // 速度制限
    await waitForDomain(input.url);

    // ナビゲーション
    await page.goto(input.url, {
      waitUntil: "domcontentloaded",
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

    // ページング: 最大MAX_PAGESページ分を収集
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

      // 自然順位100件分集まったか、次ページ無しなら終了
      const naturalCount = allItems.filter((i) => !i.isAd).length;
      if (naturalCount >= 100 || !extraction.hasNextPage || pageNum >= MAX_PAGES) {
        break;
      }

      // 次ページへ
      currentUrl = extractor.getNextPageUrl(currentUrl, pageNum);
      await waitForDomain(currentUrl);
      await page.goto(currentUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT,
      });
    }

    // 自然順位算出
    const rankResult = calculateNaturalRanks(allItems, input.hotelUrlMap);

    return {
      success: true,
      totalCountInt,
      totalCountRawText,
      rankResult,
      executedUrl: input.url,
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
