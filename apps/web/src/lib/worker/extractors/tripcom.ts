import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

/**
 * Trip.com Extractor
 *
 * Trip.com (jp.trip.com) は SPA (React):
 * - ★ ABテストで2種類のカードレイアウトあり:
 *   (A) `.hotel-card` — フルSPA描画 (ホテル名: `.hotelName`)
 *   (B) `.compressmeta-hotel-wrap-v8` — 圧縮描画 (ホテル名: リンクテキスト)
 * - ホテルID: カード要素の `id` 属性 (両方共通)
 * - ★ 無限スクロール方式:
 *   → `?page=N` は機能しない (同じ結果が返る)
 *   → scrollBy で段階的にスクロール (~12件ずつバッチロード)
 *   → 初期表示 ~12件 → スクロールで ~220件 (那覇エリア内)
 * - ★ 境界検出: `.more-hotel-title` 出現で「周辺の施設」に拡張
 *   → この要素より前のカードだけが正しいエリア内結果
 * - 速度制限: 2,000 ms + jitter (rate-limiter.ts に設定済み)
 * - StealthPlugin 使用 (browser-pool.ts で適用済み)
 */

/**
 * ★ ABテスト対応: 両方のカードセレクタをOR結合
 * (A) .hotel-card — フルSPAレイアウト
 * (B) [class*="compressmeta-hotel-wrap"] — 圧縮レイアウト
 */
const CARD_SELECTOR = '.hotel-card, [class*="compressmeta-hotel-wrap"]';

/** カード出現ポーリング: 最大15回 × 2秒 = 30秒 */
const CARD_POLL_MAX = 15;
const CARD_POLL_INTERVAL = 2000;
/** 最大スクロール回数 */
const MAX_SCROLLS = 100;

export const tripcomExtractor: OtaExtractor = {
  ota: "tripcom",
  isScrollBased: true,

  async extractPage(page: Page): Promise<PageExtraction> {
    // ★ カード出現までポーリング (ABテスト両方のセレクタに対応)
    let initialCardCount = 0;
    for (let i = 0; i < CARD_POLL_MAX; i++) {
      initialCardCount = await page.locator(CARD_SELECTOR).count();
      if (initialCardCount > 0) break;
      // スクロールで描画をトリガー
      await page.evaluate(() => window.scrollTo(0, 300));
      await page.waitForTimeout(CARD_POLL_INTERVAL);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    }

    if (initialCardCount === 0) {
      return {
        totalCount: null,
        totalCountRawText: null,
        items: [],
        hasNextPage: false,
      };
    }

    // 総件数を取得
    const { totalCount, totalCountRawText } = await page.evaluate(() => {
      // Trip.com の総件数: "400軒のホテルがあります" (class*="count" 要素)
      const countEls = document.querySelectorAll('[class*="count"]');
      for (const el of countEls) {
        const text = (el.textContent || "").trim();
        const m = text.match(/(\d[\d,]*)\s*軒/);
        if (m) {
          const num = parseInt(m[1].replace(/,/g, ""), 10) || null;
          return { totalCount: num, totalCountRawText: m[0] };
        }
      }
      // フォールバック: body テキスト全体
      const bodyText = document.body.innerText;
      const m = bodyText.match(/(\d[\d,]*)\s*軒/);
      if (m) {
        const num = parseInt(m[1].replace(/,/g, ""), 10) || null;
        return { totalCount: num, totalCountRawText: m[0] };
      }
      return { totalCount: null, totalCountRawText: null };
    });

    // ★ 無限スクロールで全カード読み込み
    // Trip.com は scrollBy で ~12件ずつバッチロード
    // `.more-hotel-title` が出現したらエリア外の施設 → 停止
    // ページ最下部到達後にカード数が安定したら完了
    const cardSel = CARD_SELECTOR;
    let reachedBottom = false;
    let prevCardCount = 0;
    let stableAtBottom = 0;

    for (let scroll = 0; scroll < MAX_SCROLLS; scroll++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(1500);

      // ★ 境界検出: 「周辺の施設も含まれるよう、検索範囲を広げました」
      const hasBoundary = await page.evaluate(
        () => document.querySelector(".more-hotel-title") !== null,
      );
      if (hasBoundary) break;

      const atBottom = await page.evaluate(
        () =>
          window.scrollY + window.innerHeight >=
          document.body.scrollHeight - 200,
      );

      if (atBottom) {
        reachedBottom = true;
        await page.waitForTimeout(2000);
      }

      const currentCount = await page.locator(cardSel).count();

      // naturalCount >= 200 で早期停止
      if (currentCount >= 200) break;

      if (reachedBottom) {
        if (currentCount === prevCardCount) {
          stableAtBottom++;
          if (stableAtBottom >= 3) break;
        } else {
          // 新コンテンツ読み込み → 再スクロール
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

    // page.evaluate() で全カード一括抽出
    // ★ ABテスト両対応 + `.more-hotel-title` 境界チェック
    const extracted = await page.evaluate((sel) => {
      const moreEl = document.querySelector(".more-hotel-title");
      const cards = document.querySelectorAll(sel);
      const items: Array<{
        hotelId: string;
        name: string | null;
        isAd: boolean;
      }> = [];

      cards.forEach((card) => {
        // 境界チェック: moreEl が存在し、card が moreEl の後にある場合はスキップ
        if (moreEl) {
          const pos = moreEl.compareDocumentPosition(card);
          if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return;
        }

        const hotelId = card.id;
        if (!hotelId) return;

        // ★ ホテル名: ABテスト両対応
        // (A) .hotelName テキスト (フルSPAレイアウト)
        // (B) リンクテキスト (圧縮レイアウト: a[href*="hotelId="] or a[href*="/hotels/detail/"])
        let name: string | null = null;
        const hotelNameEl = card.querySelector(".hotelName");
        if (hotelNameEl?.textContent?.trim()) {
          name = hotelNameEl.textContent.trim();
        }
        if (!name) {
          const link = card.querySelector(
            'a[href*="hotelId="], a[href*="/hotels/detail/"]',
          ) as HTMLAnchorElement | null;
          if (link?.textContent?.trim()) {
            name = link.textContent.trim();
          }
        }

        // ★ 広告判定: ABテスト両対応
        let isAd = false;
        // (A) .ad-info 要素
        if (card.querySelector(".ad-info")) isAd = true;
        // (B) span テキストで判定
        if (!isAd) {
          const spans = card.querySelectorAll("span");
          spans.forEach((span) => {
            const t = (span.textContent || "").trim();
            if (t === "広告" || t === "Ad" || t === "Sponsored" || t === "PR")
              isAd = true;
          });
        }

        items.push({ hotelId, name, isAd });
      });

      return items;
    }, CARD_SELECTOR);

    const items: ListItem[] = extracted.map((item) => ({
      propertyUrl: normalizeTripcomUrl(item.hotelId),
      propertyId: item.hotelId,
      name: item.name ?? undefined,
      isAd: item.isAd,
    }));

    return {
      totalCount,
      totalCountRawText,
      items,
      hasNextPage: false, // 全カード取得済み (無限スクロールで処理)
    };
  },

  // 無限スクロール方式: extractPage() 内で全カード取得するため no-op
  getNextPageUrl(currentUrl: string, _currentPage: number): string {
    return currentUrl;
  },
};

/**
 * Trip.com URL正規化: hotelIdベースの統一形式に変換
 *
 * - 数字のみ: "759848" → https://jp.trip.com/hotels/hotel-detail-759848
 * - 検索結果リンク: /hotels/detail/?hotelId=759848&... → /hotels/hotel-detail-759848
 * - 施設ページURL: /hotels/naha-hotel-detail-105013347 → /hotels/hotel-detail-105013347
 */
export function normalizeTripcomUrl(href: string): string {
  // 数字のみ → hotelId として正規化
  if (/^\d+$/.test(href)) {
    return `https://jp.trip.com/hotels/hotel-detail-${href}`;
  }

  try {
    const url = new URL(href, "https://jp.trip.com");

    // Case 1: /hotels/detail/?hotelId=XXXXX (検索結果リンク)
    const hotelIdParam = url.searchParams.get("hotelId");
    if (hotelIdParam) {
      return `https://jp.trip.com/hotels/hotel-detail-${hotelIdParam}`;
    }

    // Case 2: /hotels/XXXXX-hotel-detail-NNNNN (施設ページURL)
    const pathMatch = url.pathname.match(/hotel-detail-(\d+)/);
    if (pathMatch) {
      return `https://jp.trip.com/hotels/hotel-detail-${pathMatch[1]}`;
    }

    // Fallback: origin + pathname
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return href;
  }
}
