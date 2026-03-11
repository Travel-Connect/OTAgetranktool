import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

/**
 * Agoda Extractor
 *
 * Agoda (agoda.com) は SPA (React):
 * - カード: `li[data-hotelid]` in `ol.hotel-list-container`
 * - ホテルID: `data-hotelid` 属性
 * - ホテル名: `[data-selenium="hotel-name"]` or リンクテキスト
 * - ★ ハイブリッド方式: ページ内無限スクロール + "次のページへ >>" ボタン
 *   → 各ページ内でスクロールして全カード読み込み (~11 → ~100件)
 *   → ボタンクリックで次ページ遷移
 * - 初期ローディング: "少々お待ちください" 画面あり (networkidle が早すぎる)
 *   → waitUntil: "load" + カード出現までポーリング (最大60秒)
 * - 速度制限: 3,000 ms + jitter (rate-limiter.ts に設定済み)
 * - StealthPlugin 使用 (browser-pool.ts で適用済み)
 */

const MAX_INTERNAL_PAGES = 20;
/** カード出現ポーリング: 最大30回 × 2秒 = 60秒 */
const CARD_POLL_MAX = 30;
const CARD_POLL_INTERVAL = 2000;

export const agodaExtractor: OtaExtractor = {
  ota: "agoda",
  isScrollBased: true,
  // networkidle はローディング画面で早期発火するため load を使用
  waitUntil: "load",

  async extractPage(page: Page): Promise<PageExtraction> {
    // ★ カード出現までポーリング (ローディング画面 "少々お待ちください" を通過)
    let initialCardCount = 0;
    for (let i = 0; i < CARD_POLL_MAX; i++) {
      initialCardCount = await page.locator("li[data-hotelid]").count();
      if (initialCardCount > 0) break;
      await page.waitForTimeout(CARD_POLL_INTERVAL);
    }

    if (initialCardCount === 0) {
      return {
        totalCount: null,
        totalCountRawText: null,
        items: [],
        hasNextPage: false,
      };
    }

    // 総件数を取得 (最初のページでのみ)
    const { totalCount, totalCountRawText } = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const m = bodyText.match(/(\d[\d,]*)\s*軒/);
      if (m) {
        const num = parseInt(m[1].replace(/,/g, ""), 10) || null;
        return { totalCount: num, totalCountRawText: m[0] };
      }
      return { totalCount: null, totalCountRawText: null };
    });

    // 全ページのアイテムを収集 (重複排除用)
    const allItems: ListItem[] = [];
    const seenHotelIds = new Set<string>();

    for (let internalPage = 0; internalPage < MAX_INTERNAL_PAGES; internalPage++) {
      // ★ ページ内無限スクロール
      // Agoda はバッチロード方式 (11→49→98件): IntersectionObserver で段階的に読み込み
      // scrollTo(bottom) ジャンプでは Observer が発火しないため、scrollBy で段階的にスクロール
      // 安定判定: ページ最下部に到達後、カード数が変化しなくなったら完了
      let reachedBottom = false;
      let prevCardCount = 0;
      let stableAtBottom = 0;

      for (let scroll = 0; scroll < 50; scroll++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(1500);

        const atBottom = await page.evaluate(() =>
          window.scrollY + window.innerHeight >= document.body.scrollHeight - 200,
        );

        if (atBottom) {
          reachedBottom = true;
          // 最下部でバッチロード完了を待つ
          await page.waitForTimeout(2000);
        }

        const currentCount = await page.locator("li[data-hotelid]").count();

        if (reachedBottom) {
          if (currentCount === prevCardCount) {
            stableAtBottom++;
            if (stableAtBottom >= 2) break;
          } else {
            // 新コンテンツ読み込み → ページが伸びたので再スクロール
            stableAtBottom = 0;
            prevCardCount = currentCount;
            reachedBottom = false;
          }
        } else {
          prevCardCount = currentCount;
        }
      }

      // ページトップに戻す
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      // 現在のページからアイテムを抽出
      const pageItems = await page.evaluate(() => {
        const cards = document.querySelectorAll("li[data-hotelid]");
        const items: Array<{
          hotelId: string;
          name: string | null;
          isAd: boolean;
        }> = [];

        cards.forEach((card) => {
          const hotelId = card.getAttribute("data-hotelid");
          if (!hotelId) return;

          // ホテル名: 複数フォールバック
          let name: string | null = null;
          const nameEl = card.querySelector(
            '[data-selenium="hotel-name"]',
          );
          if (nameEl?.textContent?.trim()) {
            name = nameEl.textContent.trim();
          } else {
            // フォールバック1: ホテルリンクのテキスト
            const link = card.querySelector(
              'a[href*="/hotel/"]',
            ) as HTMLAnchorElement | null;
            if (link?.textContent?.trim()) {
              let t = link.textContent.trim();
              // "を新しいタブで開く" を除去
              t = t.replace(/を新しいタブで開く$/u, "").trim();
              if (t.length > 2) name = t;
            }
          }
          if (!name) {
            // フォールバック2: ScreenReaderOnly span
            const srSpan = card.querySelector(
              '[class*="ScreenReaderOnly"]',
            );
            if (srSpan?.textContent?.trim()) {
              let t = srSpan.textContent.trim();
              t = t.replace(/を新しいタブで開く$/u, "").trim();
              if (t.length > 2) name = t;
            }
          }

          // 広告判定
          let isAd = false;
          const sponsoredEl = card.querySelector(
            '[class*="sponsored"], [class*="Sponsored"], [data-testid="sponsored"]',
          );
          if (sponsoredEl) isAd = true;
          if (!isAd) {
            const spans = card.querySelectorAll("span");
            for (const span of spans) {
              const t = span.textContent?.trim();
              if (
                t === "広告" ||
                t === "Ad" ||
                t === "Sponsored" ||
                t === "PR"
              ) {
                isAd = true;
                break;
              }
            }
          }

          items.push({ hotelId, name, isAd });
        });

        return items;
      });

      // ListItem 形式に変換して追加 (重複排除)
      for (const item of pageItems) {
        if (seenHotelIds.has(item.hotelId)) continue;
        seenHotelIds.add(item.hotelId);
        allItems.push({
          propertyUrl: normalizeAgodaUrl(item.hotelId),
          propertyId: item.hotelId,
          name: item.name ?? undefined,
          isAd: item.isAd,
        });
      }

      // 自然順位200件到達チェック
      const naturalCount = allItems.filter((i) => !i.isAd).length;
      if (naturalCount >= 200) break;

      // ★ 次のページボタンをJS経由でクリック (overlay回避)
      const firstHotelIdBefore = pageItems[0]?.hotelId;
      const clicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll("button");
        for (const btn of buttons) {
          if (btn.textContent?.includes("次のページへ")) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!clicked) break;

      // ★ ページ遷移完了を待つ: 最初のカードIDが変わるまでポーリング
      await page.waitForTimeout(3000);
      for (let i = 0; i < CARD_POLL_MAX; i++) {
        const count = await page.locator("li[data-hotelid]").count();
        if (count > 0) {
          const newFirstId = await page.evaluate(() => {
            const first = document.querySelector("li[data-hotelid]");
            return first?.getAttribute("data-hotelid") ?? null;
          });
          if (newFirstId && newFirstId !== firstHotelIdBefore) break;
        }
        await page.waitForTimeout(CARD_POLL_INTERVAL);
      }
      await page.waitForTimeout(1000);
    }

    return {
      totalCount,
      totalCountRawText,
      items: allItems,
      hasNextPage: false, // 全ページ取得済み (内部ループで処理)
    };
  },

  // SPA ボタンクリック式: extractPage() 内で全ページ取得するため no-op
  getNextPageUrl(currentUrl: string, _currentPage: number): string {
    return currentUrl;
  },
};

/**
 * Agoda URL正規化: hotelId ベースの統一形式
 *
 * 入力パターン:
 *   "69283" (数字のみ)  → https://www.agoda.com/hotel-69283
 *   "/ja-jp/loisir-hotel-naha/hotel/okinawa-main-island-jp.html?..." → origin+pathname
 *
 * Extractorは data-hotelid から数字を渡すため、通常は数字パターンが使われる。
 * hotel_ota_mappings にも hotelId (数字) を格納する。
 */
export function normalizeAgodaUrl(hotelIdOrHref: string): string {
  // 数字のみ → hotelId として正規化
  if (/^\d+$/.test(hotelIdOrHref)) {
    return `https://www.agoda.com/hotel-${hotelIdOrHref}`;
  }

  try {
    const url = new URL(hotelIdOrHref, "https://www.agoda.com");
    // origin + pathname (クエリパラメータ除去)
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return hotelIdOrHref;
  }
}
