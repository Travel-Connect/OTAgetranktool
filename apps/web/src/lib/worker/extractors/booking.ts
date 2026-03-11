import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

/**
 * Booking.com Extractor
 *
 * Booking.com (booking.com) は SSR + React ハイブリッド:
 * - カード: `[data-testid="property-card"]`
 * - ホテル名: `[data-testid="title"]`
 * - ホテルURL: `[data-testid="title-link"]` href → `/hotel/jp/{slug}.ja.html`
 * - 総件数: h1 テキスト「那覇市：364軒が見つかりました」→ /(\d[\d,]*)\s*軒/
 * - ページネーション: 初期 ~27件 → 無限スクロールで ~77件 → 「検索結果をさらに読み込む」ボタンで ~25件ずつ追加
 *   → extractPage() 内でスクロール + ボタンクリックで全件取得
 * - Geniusログインモーダル: ページ下部到達時にポップアップ → 自動で閉じる
 * - 広告: 現状Booking.comでは検索結果内に広告バッジなし (preferred-badge は推奨宿バッジ)
 * - 速度制限: 2,500 ms + jitter (rate-limiter.ts に設定済み)
 * - StealthPlugin 使用 (browser-pool.ts で適用済み)
 *
 * ★ ボット検出に関する制限事項:
 *   Booking.comはIPベースのボット検出により、自動化ブラウザに対して
 *   実ブラウザと異なるソート順を返す場合がある。
 *   - headless Chromium: 検出されやすい (順位取得不可の場合あり)
 *   - persistent context + system Chrome: 順位取得可能だがオフセットあり
 *   warmUp() でトップページ訪問によるクッキー確立を行い検出を緩和するが、
 *   完全な回避は困難。順位の相対的な変動トラッキングとして利用推奨。
 */

const MAX_LOAD_MORE_CLICKS = 15;

export const bookingExtractor: OtaExtractor = {
  ota: "booking",
  isScrollBased: true,
  // networkidle: domcontentloaded 時に一時的な #challenge-container が存在し
  // detectBlock の偽陽性を引き起こすため、JS チャレンジ完了を待つ
  waitUntil: "networkidle",

  /**
   * ウォームアップ: Booking.com トップページに先行訪問してクッキーを取得。
   * ボット検出緩和のため、検索ページ前にセッションクッキーを確立する。
   */
  async warmUp(page: Page): Promise<void> {
    await page.goto("https://www.booking.com/?lang=ja", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    }).catch(() => {});
    // クッキー同意バナーを閉じる
    await page.evaluate(() => {
      const btn = document.querySelector("#onetrust-accept-btn-handler") as HTMLButtonElement | null;
      if (btn) btn.click();
    });
    await page.waitForTimeout(2000);
  },

  async extractPage(page: Page): Promise<PageExtraction> {
    // 初期カード描画を待つ
    await page
      .waitForSelector('[data-testid="property-card"]', { timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(3000);

    // Geniusログインモーダルを閉じる（出現時）
    await dismissGeniusModal(page);

    // 総件数を取得
    const { totalCount, totalCountRawText } = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const h1Text = h1?.textContent?.trim() ?? "";
      const m = h1Text.match(/(\d[\d,]*)\s*軒/);
      if (m) {
        const num = parseInt(m[1].replace(/,/g, ""), 10) || null;
        return { totalCount: num, totalCountRawText: m[0] };
      }
      // フォールバック: body テキストから検索
      const bodyText = document.body.innerText;
      const bm = bodyText.match(/(\d[\d,]*)\s*軒/);
      if (bm) {
        const num = parseInt(bm[1].replace(/,/g, ""), 10) || null;
        return { totalCount: num, totalCountRawText: bm[0] };
      }
      return { totalCount: null, totalCountRawText: null };
    });

    // ★ Phase 1: 初回無限スクロールで遅延読み込みカードを全て表示
    // (初期 ~27件 → スクロールで ~77件まで増加)
    let prevScrollCount = 0;
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
      // Geniusモーダルがスクロール中に出現する場合がある
      await dismissGeniusModal(page);
      const count = await page
        .locator('[data-testid="property-card"]')
        .count();
      if (count === prevScrollCount) {
        // 2回連続で変化なし → スクロール完了
        if (i > 0) break;
      }
      prevScrollCount = count;
    }

    // ★ Phase 2: 「検索結果をさらに読み込む」ボタンを繰り返しクリック
    for (let click = 0; click < MAX_LOAD_MORE_CLICKS; click++) {
      const currentCount = await page
        .locator('[data-testid="property-card"]')
        .count();
      if (currentCount >= 200) break;

      // ボタンをJS経由でクリック (overlay回避)
      const clicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll("button");
        for (const btn of buttons) {
          if (btn.textContent?.includes("検索結果をさらに読み込む")) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!clicked) break;

      // 新しいカード読み込み待ち
      await page.waitForTimeout(3000);

      // スクロールして遅延読み込みを促す + Geniusモーダル対応
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await page.waitForTimeout(1500);
        await dismissGeniusModal(page);
      }
    }

    // page.evaluate() で全カード一括抽出
    const pageItems = await page.evaluate(() => {
      const cards = document.querySelectorAll(
        '[data-testid="property-card"]',
      );
      const items: Array<{
        href: string;
        name: string | null;
        isAd: boolean;
      }> = [];

      cards.forEach((card) => {
        // ホテルURL
        const titleLink = card.querySelector(
          '[data-testid="title-link"]',
        ) as HTMLAnchorElement | null;
        const href = titleLink?.getAttribute("href");
        if (!href) return;

        // ホテル名
        const titleEl = card.querySelector('[data-testid="title"]');
        const name = titleEl?.textContent?.trim() ?? null;

        // 広告判定 (Booking.comでは現状ほぼ出ないが安全のため)
        let isAd = false;
        const adBadge = card.querySelector('[data-testid="ad-badge"]');
        if (adBadge) isAd = true;

        if (!isAd) {
          const spans = card.querySelectorAll("span");
          for (const span of spans) {
            const t = span.textContent?.trim();
            if (
              t === "広告" ||
              t === "Ad" ||
              t === "Sponsored" ||
              t === "スポンサー"
            ) {
              isAd = true;
              break;
            }
          }
        }

        items.push({ href, name, isAd });
      });

      return items;
    });

    // ListItem 形式に変換
    const items: ListItem[] = pageItems.map((item) => ({
      propertyUrl: normalizeBookingUrl(item.href),
      name: item.name ?? undefined,
      isAd: item.isAd,
    }));

    return {
      totalCount,
      totalCountRawText,
      items,
      hasNextPage: false, // 全カード取得済み (Load More ボタンクリックで内部処理完了)
    };
  },

  // Load More ボタン方式: extractPage() 内で全カード取得するため no-op
  getNextPageUrl(currentUrl: string, _currentPage: number): string {
    return currentUrl;
  },
};

/**
 * Geniusログインモーダルを閉じる
 *
 * ページ下部スクロール時に「ログインしてお得に予約」モーダルが出現する。
 * aria-label="ログイン画面を閉じる。" の × ボタンをJS clickで閉じる。
 */
async function dismissGeniusModal(page: Page): Promise<void> {
  await page.evaluate(() => {
    const closeBtn = document.querySelector(
      'button[aria-label="ログイン画面を閉じる。"]',
    ) as HTMLButtonElement | null;
    if (closeBtn) closeBtn.click();
  });
}

/**
 * Booking.com URL正規化: origin + pathname 形式
 *
 * 入力パターン:
 *   "https://www.booking.com/hotel/jp/loisir-naha.ja.html?aid=...&label=..." → "/hotel/jp/loisir-naha.ja.html"
 *   "/hotel/jp/loisir-naha.ja.html" → "https://www.booking.com/hotel/jp/loisir-naha.ja.html"
 *
 * クエリパラメータ (aid, label, hpos 等) を除去し、origin + pathname のみ返す。
 */
export function normalizeBookingUrl(href: string): string {
  try {
    const url = new URL(href, "https://www.booking.com");
    return `${url.origin}${url.pathname}`;
  } catch {
    return href;
  }
}
