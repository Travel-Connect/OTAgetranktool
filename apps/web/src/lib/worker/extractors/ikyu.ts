import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

const SEL = {
  item: '[data-testid="hotel-card"], .p-hotelCassette, .searchResultItem',
  propertyLink: 'a[href*="/hotel/"]',
  propertyName: '[data-testid="hotel-name"], .p-hotelCassette__name, .hotelName',
  adLabels: ['[class*="sponsor"]', '[class*="pr-"]', '[class*="ad-"]'],
  totalCount: '.p-searchSummary__count, [data-testid="search-count"], .searchSummary__count',
};

export const ikyuExtractor: OtaExtractor = {
  ota: "ikyu",

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
          propertyUrl: normalizeIkyuUrl(href),
          name: name?.trim() ?? undefined,
          isAd,
        });
      }
    }

    const hasNextPage = (await page.locator('a[rel="next"], [data-testid="next-page"]').count()) > 0;
    return { totalCount, totalCountRawText: totalCountRawText?.trim() ?? null, items, hasNextPage };
  },

  getNextPageUrl(currentUrl: string, currentPage: number): string {
    const url = new URL(currentUrl);
    url.searchParams.set("pn", String(currentPage + 1));
    return url.toString();
  },
};

function normalizeIkyuUrl(href: string): string {
  try {
    const url = new URL(href, "https://www.ikyu.com");
    return `${url.origin}${url.pathname}`;
  } catch {
    return href;
  }
}
