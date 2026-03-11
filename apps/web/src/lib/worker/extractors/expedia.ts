import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

/**
 * Expedia Extractor
 *
 * Expedia (expedia.co.jp) は React SPA + SSR ハイブリッド:
 * - DataDome (CAPTCHA) による bot 検出あり → StealthPlugin 必須
 * - カードセレクタ: [data-stid="lodging-card-responsive"]
 * - ★ 初期表示 ~18件 → 「Show more」/「さらに表示」ボタンクリックで追加ロード
 *   → 各クリックで ~80件追加
 *   → ボタンは再出現（連続クリック可能）
 * - 総件数: [data-stid="results-header-message"] テキスト
 *   → "300 軒以上の宿泊施設" or "300+ properties" (概数)
 * - 速度制限: 2,500 ms + jitter (rate-limiter.ts に設定済み)
 * - StealthPlugin 使用 (browser-pool.ts で適用済み)
 */

/** 「さらに表示」ボタン最大クリック数 */
const MAX_SHOW_MORE_CLICKS = 10;

export const expediaExtractor: OtaExtractor = {
  ota: "expedia",
  isScrollBased: true,
  // SSR + React hydration
  waitUntil: "domcontentloaded",

  async extractPage(page: Page): Promise<PageExtraction> {
    // SPA描画を待つ (DataDome 通過後にコンテンツがロードされるまで)
    await page
      .waitForSelector('[data-stid="lodging-card-responsive"]', {
        timeout: 20000,
      })
      .catch(() => {});

    // 追加の描画待ち (React hydration + lazy load)
    await page.waitForTimeout(3000);

    const initialCount = await page
      .locator('[data-stid="lodging-card-responsive"]')
      .count();

    if (initialCount === 0) {
      return {
        totalCount: null,
        totalCountRawText: null,
        items: [],
        hasNextPage: false,
      };
    }

    // 総件数を取得
    const { totalCount, totalCountRawText } = await page.evaluate(() => {
      // 1次: [data-stid="results-header-message"] (日本語/英語両対応)
      const headerMsg = document.querySelector(
        '[data-stid="results-header-message"]',
      );
      if (headerMsg) {
        const text = (headerMsg.textContent || "").trim();
        // "300 軒以上の宿泊施設" or "300+ properties" or "451 Properties"
        const m = text.match(/(\d[\d,]*)\+?\s*/);
        if (m) {
          const num = parseInt(m[1].replace(/,/g, ""), 10) || null;
          return { totalCount: num, totalCountRawText: text };
        }
      }
      // フォールバック: body テキスト
      const bodyText = document.body.textContent || "";
      // "451 Properties" or "300+ properties"
      const countMatch = bodyText.match(/(\d[\d,]*)\+?\s*[Pp]roperties/);
      if (countMatch) {
        const num = parseInt(countMatch[1].replace(/,/g, ""), 10) || null;
        return { totalCount: num, totalCountRawText: countMatch[0].trim() };
      }
      // 日本語: "300 軒以上" or "N 軒"
      const jaMatch = bodyText.match(/(\d[\d,]*)\s*軒/);
      if (jaMatch) {
        const num = parseInt(jaMatch[1].replace(/,/g, ""), 10) || null;
        return { totalCount: num, totalCountRawText: jaMatch[0].trim() };
      }
      return { totalCount: null, totalCountRawText: null };
    });

    // ★ 「Show more」/「さらに表示」ボタン連続クリックで全カード読み込み
    for (let clickNum = 0; clickNum < MAX_SHOW_MORE_CLICKS; clickNum++) {
      // 現在のカード数チェック (200件到達で停止)
      const currentCount = await page
        .locator('[data-stid="lodging-card-responsive"]')
        .count();
      if (currentCount >= 200) break;

      // ★ ボタンをJS経由でクリック (overlay回避)
      const clicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll("button");
        for (const btn of buttons) {
          const text = (btn.textContent || "").trim();
          if (
            text === "Show more" ||
            text === "さらに表示" ||
            text === "もっと見る"
          ) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!clicked) break;

      // 新しいカードの読み込み待ち
      await page.waitForTimeout(3000);

      // スクロールして遅延読み込みカードを表示
      for (let s = 0; s < 10; s++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(1000);
      }
    }

    // ページトップに戻す
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // page.evaluate() で全カード一括抽出
    const extracted = await page.evaluate(() => {
      const items: Array<{
        hotelId: string;
        name: string | null;
        isAd: boolean;
      }> = [];

      const cards = document.querySelectorAll(
        '[data-stid="lodging-card-responsive"]',
      );

      for (const card of cards) {
        // ホテルリンクからID抽出: .h{id}. パターン
        let hotelId: string | null = null;
        const links = card.querySelectorAll("a");
        for (const link of links) {
          const href = link.getAttribute("href") || "";
          const idMatch = href.match(/\.h(\d+)\./);
          if (idMatch) {
            hotelId = idMatch[1];
            break;
          }
        }
        if (!hotelId) continue;

        // ホテル名抽出 (優先順)
        let name: string | null = null;

        // 1) h3 から "Photo gallery for {Name}" を除去して取得
        const headings = card.querySelectorAll("h3");
        for (const h of headings) {
          const text = h.textContent?.trim() || "";
          if (text.startsWith("Photo gallery for ")) {
            name = text.replace("Photo gallery for ", "").trim();
            break;
          }
          if (
            !h.classList.contains("is-visually-hidden") &&
            text.length > 2
          ) {
            name = text;
            break;
          }
        }

        // 2) フォールバック: リンクテキストからホテル名を抽出
        if (!name) {
          for (const link of links) {
            const href = link.getAttribute("href") || "";
            if (!href.includes(".h" + hotelId + ".")) continue;
            const text = link.textContent?.trim() || "";
            // "More information about {Name}, opens in a new tab"
            let m = text.match(
              /More information about (.+?),?\s*opens in/i,
            );
            if (m) {
              name = m[1].trim();
              break;
            }
            // "Opens {Name} in new tab"
            m = text.match(/Opens (.+?) in new tab/i);
            if (m) {
              name = m[1].trim();
              break;
            }
          }
        }

        // 3) フォールバック: URL パスからホテル名を抽出
        if (!name) {
          for (const link of links) {
            const href = link.getAttribute("href") || "";
            const pathMatch = href.match(/-Hotels-(.+?)\.h\d+\./);
            if (pathMatch) {
              name = pathMatch[1].replace(/-/g, " ");
              break;
            }
          }
        }

        // 広告判定
        let isAd = false;
        // span.uitk-badge with text "Ad" / "広告" / "Sponsored"
        const badges = card.querySelectorAll(
          "span.uitk-badge, [class*='uitk-badge']",
        );
        for (const badge of badges) {
          const badgeText = badge.textContent?.trim();
          if (
            badgeText === "Ad" ||
            badgeText === "広告" ||
            badgeText === "Sponsored"
          ) {
            isAd = true;
            break;
          }
        }
        // data-stid*="sponsored" on parent
        if (!isAd) {
          let el: Element | null = card;
          for (let i = 0; i < 3; i++) {
            el = el?.parentElement ?? null;
            if (!el) break;
            const stid = el.getAttribute("data-stid") || "";
            if (stid.includes("sponsored")) {
              isAd = true;
              break;
            }
          }
        }

        items.push({ hotelId, name, isAd });
      }

      return items;
    });

    const items: ListItem[] = extracted.map((item) => ({
      propertyUrl: normalizeExpediaUrl(item.hotelId),
      propertyId: item.hotelId,
      name: item.name ?? undefined,
      isAd: item.isAd,
    }));

    return {
      totalCount,
      totalCountRawText,
      items,
      hasNextPage: false, // 全カード取得済み (ボタンクリックで処理)
    };
  },

  // ボタンクリック方式: extractPage() 内で全カード取得するため no-op
  getNextPageUrl(currentUrl: string, _currentPage: number): string {
    return currentUrl;
  },
};

/**
 * Expedia URL正規化: hotelIdベースの統一形式に変換
 *
 * - hotelId数字のみ: 2473847 → https://www.expedia.co.jp/.h2473847.
 * - ホテルURL: /en/Naha-Hotels-Loisir-Hotel.h2473847.Hotel-Information → https://www.expedia.co.jp/.h2473847.
 * - hotelIdパラメータ: ?hotelId=2473847 → https://www.expedia.co.jp/.h2473847.
 */
export function normalizeExpediaUrl(hotelIdOrHref: string): string {
  // 数字のみの場合はhotelIdとして直接構築
  if (/^\d+$/.test(hotelIdOrHref)) {
    return `https://www.expedia.co.jp/.h${hotelIdOrHref}.`;
  }

  try {
    const url = new URL(hotelIdOrHref, "https://www.expedia.co.jp");
    // パス内の .h{id}. パターン
    const match = url.pathname.match(/\.h(\d+)\./);
    if (match) {
      return `https://www.expedia.co.jp/.h${match[1]}.`;
    }
    // hotelId クエリパラメータ
    const hotelIdParam = url.searchParams.get("hotelId");
    if (hotelIdParam) {
      return `https://www.expedia.co.jp/.h${hotelIdParam}.`;
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return hotelIdOrHref;
  }
}
