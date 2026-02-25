import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { getNextProfile, type BrowserProfile } from "./ua-rotation";

/** グローバル同時実行数上限 */
const MAX_CONCURRENCY = 5;

let browser: Browser | null = null;
let activeContexts = 0;

/** ブラウザインスタンスを取得（シングルトン） */
async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
  }
  return browser;
}

/** セマフォ: 同時実行数を制限 */
const queue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeContexts < MAX_CONCURRENCY) {
    activeContexts++;
    return;
  }
  return new Promise<void>((resolve) => {
    queue.push(() => {
      activeContexts++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeContexts--;
  const next = queue.shift();
  if (next) next();
}

export interface WorkerContext {
  context: BrowserContext;
  page: Page;
  profile: BrowserProfile;
  release: () => Promise<void>;
}

/**
 * ワーカー用コンテキストを取得
 * - 同時実行数を MAX_CONCURRENCY に制限
 * - UA/viewport/locale をローテーション
 */
export async function acquireWorkerContext(): Promise<WorkerContext> {
  await acquireSlot();

  const profile = getNextProfile();
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent: profile.userAgent,
    viewport: profile.viewport,
    locale: profile.locale,
    timezoneId: "Asia/Tokyo",
    extraHTTPHeaders: {
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    },
  });
  const page = await context.newPage();

  return {
    context,
    page,
    profile,
    release: async () => {
      await context.close().catch(() => {});
      releaseSlot();
    },
  };
}

/** ブラウザを完全に閉じる（ジョブ完了時に呼ぶ） */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}
