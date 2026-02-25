import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

/** 楽天トラベル セレクタ定数 */
const SEL = {
  /** 一覧アイテムコンテナ */
  item: ".htlCard",
  /** 施設リンク */
  propertyLink: "a.htlCard__name",
  /** 施設名テキスト */
  propertyName: ".htlCard__name",
  /** 広告判定: PRラベル / スポンサー表示 */
  adLabels: [".htlCard__prLabel", ".htlCard__adLabel", '[class*="sponsor"]', '[class*="pr-label"]'],
  /** 総件数テキスト */
  totalCount: ".searchResult__count, .searchSummary__count, .result-count",
};

export const rakutenExtractor: OtaExtractor = {
  ota: "rakuten",

  async extractPage(page: Page): Promise<PageExtraction> {
    await page.waitForSelector(SEL.item, { timeout: 15000 }).catch(() => {});

    // 総件数
    const totalCountRawText = await page
      .locator(SEL.totalCount)
      .first()
      .textContent()
      .catch(() => null);
    const totalCount = totalCountRawText
      ? parseInt(totalCountRawText.replace(/[^0-9]/g, ""), 10) || null
      : null;

    // 一覧アイテム
    const itemElements = await page.locator(SEL.item).all();
    const items: ListItem[] = [];

    for (const el of itemElements) {
      const linkEl = el.locator(SEL.propertyLink).first();
      const href = await linkEl.getAttribute("href").catch(() => null);
      const name = await linkEl.textContent().catch(() => null);

      // 広告判定: いずれかの広告ラベルが存在するか
      let isAd = false;
      for (const adSel of SEL.adLabels) {
        const adCount = await el.locator(adSel).count();
        if (adCount > 0) {
          isAd = true;
          break;
        }
      }

      if (href) {
        items.push({
          propertyUrl: normalizeRakutenUrl(href),
          name: name?.trim() ?? undefined,
          isAd,
        });
      }
    }

    // 次ページ判定
    const hasNextPage = (await page.locator('a[rel="next"], .pagination__next:not(.is-disabled)').count()) > 0;

    return { totalCount, totalCountRawText: totalCountRawText?.trim() ?? null, items, hasNextPage };
  },

  getNextPageUrl(currentUrl: string, currentPage: number): string {
    const url = new URL(currentUrl);
    url.searchParams.set("f_page", String(currentPage + 1));
    return url.toString();
  },
};

function normalizeRakutenUrl(href: string): string {
  try {
    const url = new URL(href, "https://travel.rakuten.co.jp");
    // クエリとフラグメント除去して施設URLに正規化
    return `${url.origin}${url.pathname}`;
  } catch {
    return href;
  }
}
