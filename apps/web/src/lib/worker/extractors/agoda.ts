import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

const SEL = {
  item: '[data-testid="property-card"], .PropertyCard, [data-element-name="property-card"]',
  propertyLink: 'a[href*="/hotel/"], a[href*="/ja-jp/"]',
  propertyName: '[data-testid="property-card-name"], .PropertyCard__HotelName, h3.sc-jrAGrp',
  adLabels: ['[data-testid="sponsored-badge"]', '[class*="sponsored"]', '[class*="ad-label"]'],
  totalCount: '[data-testid="result-count"], .SearchSummary__Count, .search-result-count',
};

export const agodaExtractor: OtaExtractor = {
  ota: "agoda",

  async extractPage(page: Page): Promise<PageExtraction> {
    await page.waitForSelector(SEL.item, { timeout: 15000 }).catch(() => {});

    const totalCountRawText = await page
      .locator(SEL.totalCount)
      .first()
      .textContent()
      .catch(() => null);
    const totalCount = totalCountRawText
      ? parseInt(totalCountRawText.replace(/[^0-9]/g, ""), 10) || null
      : null;

    const itemElements = await page.locator(SEL.item).all();
    const items: ListItem[] = [];

    for (const el of itemElements) {
      const linkEl = el.locator(SEL.propertyLink).first();
      const href = await linkEl.getAttribute("href").catch(() => null);
      const nameEl = el.locator(SEL.propertyName).first();
      const name = await nameEl.textContent().catch(() => null);

      let isAd = false;
      for (const adSel of SEL.adLabels) {
        if ((await el.locator(adSel).count()) > 0) {
          isAd = true;
          break;
        }
      }

      if (href) {
        items.push({
          propertyUrl: normalizeAgodaUrl(href),
          name: name?.trim() ?? undefined,
          isAd,
        });
      }
    }

    const hasNextPage = (await page.locator('[data-testid="next-page"], [id="paginationNext"]').count()) > 0;
    return { totalCount, totalCountRawText: totalCountRawText?.trim() ?? null, items, hasNextPage };
  },

  getNextPageUrl(currentUrl: string, currentPage: number): string {
    const url = new URL(currentUrl);
    url.searchParams.set("page", String(currentPage + 1));
    return url.toString();
  },
};

function normalizeAgodaUrl(href: string): string {
  try {
    const url = new URL(href, "https://www.agoda.com");
    return `${url.origin}${url.pathname}`;
  } catch {
    return href;
  }
}
