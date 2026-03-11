import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

/**
 * Yahooトラベル Extractor
 *
 * Yahooトラベルは一休と技術的に統合されている (Nuxt.js SPA):
 * - DOM構造・セレクタは一休と完全同一
 * - ドメインのみ異なる: travel.yahoo.co.jp vs www.ikyu.com
 * - 掲載施設が異なる (一休は審査通過施設のみ、Yahooは審査不要も含む)
 * - 検索順位も異なる可能性あり
 *
 * Schema.orgマークアップ活用: section[itemprop="itemListElement"]
 * ホテルID: meta[itemprop="url"] (8桁ゼロ埋めID)
 * ページネーション: パスベース /p2/, /p3/ ... (1ページ20件)
 * ホテルURL形式: https://travel.yahoo.co.jp/00912308/
 */

const ITEMS_PER_PAGE = 20;

export const yahooExtractor: OtaExtractor = {
  ota: "yahoo",
  itemsPerPage: 20,
  // SPA (Nuxt.js) のため networkidle で完全レンダリングを待つ
  waitUntil: "networkidle",

  async extractPage(page: Page): Promise<PageExtraction> {
    // SPA完全レンダリングを待つ
    await page
      .waitForSelector('section[itemprop="itemListElement"]', { timeout: 15000 })
      .catch(() => {});

    // page.evaluate() で一括抽出
    const extracted = await page.evaluate(() => {
      // === 1. 総件数 ===
      let totalCount: number | null = null;
      let totalCountRawText: string | null = null;

      const bodyText = document.body.textContent || "";
      const countMatch = bodyText.match(/対象施設[：:\s]*(\d+)\s*件/);
      if (countMatch) {
        totalCount = parseInt(countMatch[1], 10);
        totalCountRawText = countMatch[0].trim();
      }

      // === 2. ホテルアイテム収集 (Schema.org マークアップ活用) ===
      const items: Array<{
        hotelId: string;
        name: string | null;
        isAd: boolean;
      }> = [];

      const cards = document.querySelectorAll(
        'section[itemprop="itemListElement"]',
      );

      for (const card of cards) {
        // ホテルID: meta[itemprop="url"] content="/00002680/"
        const urlMeta = card.querySelector('meta[itemprop="url"]');
        const urlContent = urlMeta?.getAttribute("content") || "";
        const idMatch = urlContent.match(/\/(\d{5,})\//);
        if (!idMatch) continue;

        const hotelId = idMatch[1];

        // ホテル名: meta[itemprop="description"] の "|" 前を使用
        let name: string | null = null;
        const descMeta = card.querySelector('meta[itemprop="description"]');
        if (descMeta) {
          const desc = descMeta.getAttribute("content") || "";
          const pipeIdx = desc.indexOf(" | ");
          name = pipeIdx > 0 ? desc.substring(0, pipeIdx).trim() : desc.trim();
        }

        // fallback: itemprop="name" テキスト
        if (!name) {
          const nameEl = card.querySelector('[itemprop="name"]');
          if (nameEl) name = nameEl.textContent?.trim() || null;
        }

        // fallback: ホテルIDを含むリンクのテキスト
        if (!name) {
          const links = card.querySelectorAll(`a[href*="/${hotelId}/"]`);
          for (const link of links) {
            const text = (link.textContent || "").trim();
            if (text.length > 3 && text.length < 100 && !text.includes("円")) {
              name = text;
              break;
            }
          }
        }

        // 広告判定
        let isAd = false;
        const cardText = card.textContent || "";
        if (
          card.querySelector('[class*="sponsor"]') ||
          card.querySelector('[class*="ad-label"]') ||
          /^\s*(PR|AD|広告|スポンサー)\s*$/m.test(cardText)
        ) {
          isAd = true;
        }

        items.push({ hotelId, name, isAd });
      }

      // === 3. 次ページ判定 ===
      let hasNext = false;
      const allLinks = document.querySelectorAll("a");
      for (const link of allLinks) {
        const text = (link.textContent || "").trim();
        if (text === "次へ" || text === "次のページ") {
          hasNext = true;
          break;
        }
      }

      return { totalCount, totalCountRawText, items, hasNext };
    });

    // ListItem 形式に変換
    const items: ListItem[] = extracted.items.map((item) => ({
      propertyUrl: normalizeYahooUrl(item.hotelId),
      propertyId: item.hotelId,
      name: item.name ?? undefined,
      isAd: item.isAd,
    }));

    return {
      totalCount: extracted.totalCount,
      totalCountRawText: extracted.totalCountRawText,
      items,
      hasNextPage: extracted.hasNext,
    };
  },

  getNextPageUrl(currentUrl: string, currentPage: number): string {
    // パスベース: /area/ma047007/p2/, /okinawa/36201004/p2/
    const url = new URL(currentUrl);

    // 既存の /pN/ を除去
    url.pathname = url.pathname.replace(/\/p\d+\/?/, "/");

    // 末尾スラッシュ統一
    if (!url.pathname.endsWith("/")) {
      url.pathname += "/";
    }

    const nextPage = currentPage + 1;
    if (nextPage > 1) {
      url.pathname += `p${nextPage}/`;
    }

    return url.toString();
  },

  getPageUrl(baseUrl: string, pageNumber: number): string {
    const url = new URL(baseUrl);
    url.pathname = url.pathname.replace(/\/p\d+\/?/, "/");
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    if (pageNumber > 1) url.pathname += `p${pageNumber}/`;
    return url.toString();
  },
};

/**
 * Yahooトラベル URL正規化: hotelIdベースの統一形式に変換
 *
 * - hotelId数字のみ: 00912308 → https://travel.yahoo.co.jp/00912308/
 * - 施設ページURL: /00912308/?discsort=1&lc=1 → https://travel.yahoo.co.jp/00912308/
 */
export function normalizeYahooUrl(hotelIdOrHref: string): string {
  // 数字のみの場合はhotelIdとして直接構築
  if (/^\d+$/.test(hotelIdOrHref)) {
    return `https://travel.yahoo.co.jp/${hotelIdOrHref}/`;
  }

  try {
    const url = new URL(hotelIdOrHref, "https://travel.yahoo.co.jp");
    const match = url.pathname.match(/\/(\d{5,})\//);
    if (match) {
      return `https://travel.yahoo.co.jp/${match[1]}/`;
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return hotelIdOrHref;
  }
}
