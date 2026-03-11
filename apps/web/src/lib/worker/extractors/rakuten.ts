import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

/**
 * 楽天トラベル Extractor
 *
 * 楽天はSSRページに構造化データを埋め込んでいる:
 * - window.ds.displayedHotels: hotelNo の配列（表示順）
 * - window.ds.totalResults: ["N"] 総件数
 * - アンカータグの l-id パラメータで広告判定（_ad_ を含む）
 */

const ITEMS_PER_PAGE = 30;

export const rakutenExtractor: OtaExtractor = {
  ota: "rakuten",
  itemsPerPage: 30,
  waitUntil: "domcontentloaded", // SSRのため networkidle はタイムアウトする

  async extractPage(page: Page): Promise<PageExtraction> {
    // SSRだがDOM完全ロードを待つ
    await page
      .waitForSelector('a[href*="/HOTEL/"]', { timeout: 15000 })
      .catch(() => {});

    // page.evaluate() で一括抽出
    const extracted = await page.evaluate(() => {
      // === 1. ds オブジェクトからデータ取得 ===
      const ds = (window as any).ds;
      let totalCount: number | null = null;
      let totalCountRawText: string | null = null;
      let displayedHotelIds: number[] = [];

      try {
        // 総件数: ds.totalResults = ["233"]
        if (ds?.totalResults?.[0]) {
          totalCount = Number(ds.totalResults[0]);
          totalCountRawText = `${totalCount}件`;
        }
        // ホテルID配列: ds.displayedHotels = [2906, 146927, ...]
        displayedHotelIds = ds?.displayedHotels || [];
      } catch {}

      // フォールバック: 画面テキストから総件数を抽出
      if (totalCount === null) {
        const bodyText = document.body.textContent || "";
        const countMatch = bodyText.match(/(\d+)件中/);
        if (countMatch) {
          totalCount = parseInt(countMatch[1], 10);
          totalCountRawText = countMatch[0];
        }
      }

      // === 3. DOM アンカータグからホテル情報を収集 ===
      const hotelLinks = document.querySelectorAll('a[href*="/HOTEL/"]');

      const hotelInfoMap: Record<
        string,
        { name: string | null; isAd: boolean }
      > = {};

      for (const link of hotelLinks) {
        const href = (link as HTMLAnchorElement).href;
        const hotelNoMatch = href.match(/\/HOTEL\/(\d+)\//);
        if (!hotelNoMatch) continue;
        const hotelNo = hotelNoMatch[1];

        // l-id パラメータで広告判定
        const lIdMatch = href.match(/l-id=([^&]+)/);
        const lId = lIdMatch ? lIdMatch[1] : "";
        const isAd = lId.includes("_ad_");

        // ホテル名: リンクテキストから取得（不要テキストを除外）
        const text = link.textContent?.trim();
        const isNameLink =
          text &&
          text.length > 2 &&
          !/^\d/.test(text) &&
          !text.includes("件") &&
          !text.includes("写真") &&
          !text.includes("クチコミ") &&
          !text.includes("もっと見る") &&
          !text.includes("地図") &&
          !text.includes("予約");

        if (!hotelInfoMap[hotelNo]) {
          hotelInfoMap[hotelNo] = { name: null, isAd };
        }
        if (isNameLink && !hotelInfoMap[hotelNo].name) {
          hotelInfoMap[hotelNo].name = text || null;
        }
        if (isAd) {
          hotelInfoMap[hotelNo].isAd = true;
        }
      }

      // === 4. 順序付きアイテムリスト構築 ===
      const orderedIds =
        displayedHotelIds.length > 0
          ? displayedHotelIds.map(String)
          : Object.keys(hotelInfoMap);

      const items: Array<{
        hotelNo: string;
        name: string | null;
        isAd: boolean;
      }> = [];

      for (const hotelNo of orderedIds) {
        const info = hotelInfoMap[hotelNo];
        if (info) {
          items.push({ hotelNo, name: info.name, isAd: info.isAd });
        }
      }

      return { totalCount, totalCountRawText, items };
    });

    // ListItem 形式に変換
    const items: ListItem[] = extracted.items.map((item) => ({
      propertyUrl: normalizeRakutenUrl(item.hotelNo),
      name: item.name ?? undefined,
      isAd: item.isAd,
    }));

    // 次ページ判定: 全アイテム数(広告含む) >= 30 なら次ページあり
    // 楽天は1ページ30件表示で、広告は別枠なので全体で判定
    const hasNextPage = items.length >= ITEMS_PER_PAGE;

    return {
      totalCount: extracted.totalCount,
      totalCountRawText: extracted.totalCountRawText,
      items,
      hasNextPage,
    };
  },

  getNextPageUrl(currentUrl: string, currentPage: number): string {
    const url = new URL(currentUrl);
    url.searchParams.set("f_page", String(currentPage + 1));
    return url.toString();
  },

  getPageUrl(baseUrl: string, pageNumber: number): string {
    const url = new URL(baseUrl);
    if (pageNumber > 1) {
      url.searchParams.set("f_page", String(pageNumber));
    } else {
      url.searchParams.delete("f_page");
    }
    return url.toString();
  },
};

/**
 * 楽天トラベル URL正規化: hotelNoベースの統一形式に変換
 *
 * - hotelNo数字のみ: 12551 → /HOTEL/12551/
 * - 施設ページURL: /HOTEL/12551/12551.html?l-id=... → /HOTEL/12551/
 * - 任意のパス形式: /HOTEL/12551/xxx → /HOTEL/12551/
 */
export function normalizeRakutenUrl(hotelNoOrHref: string): string {
  // 数字のみの場合はhotelNoとして直接構築
  if (/^\d+$/.test(hotelNoOrHref)) {
    return `https://travel.rakuten.co.jp/HOTEL/${hotelNoOrHref}/`;
  }

  try {
    const url = new URL(hotelNoOrHref, "https://travel.rakuten.co.jp");
    const match = url.pathname.match(/\/HOTEL\/(\d+)/);
    if (match) {
      return `https://travel.rakuten.co.jp/HOTEL/${match[1]}/`;
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return hotelNoOrHref;
  }
}
