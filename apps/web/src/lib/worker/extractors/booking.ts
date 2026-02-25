import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

const SEL = {
  item: '[data-testid="property-card"], .sr_property_block',
  propertyLink: '[data-testid="title-link"], a.hotel_name_link',
  propertyName: '[data-testid="title"], .sr-hotel__name',
  adLabels: ['[data-testid="ad-badge"]', '[class*="bui-badge--sponsored"]', '[class*="sponsored"]'],
  totalCount: '[data-testid="results-count"], .sorth1, h1',
};

export const bookingExtractor: OtaExtractor = {
  ota: "booking",

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
          propertyUrl: normalizeBookingUrl(href),
          name: name?.trim() ?? undefined,
          isAd,
        });
      }
    }

    const hasNextPage =
      (await page.locator('[data-testid="pagination-next"], button[aria-label="次のページ"]').count()) > 0;
    return { totalCount, totalCountRawText: totalCountRawText?.trim() ?? null, items, hasNextPage };
  },

  getNextPageUrl(currentUrl: string, currentPage: number): string {
    const url = new URL(currentUrl);
    url.searchParams.set("offset", String(currentPage * 25));
    return url.toString();
  },
};

function normalizeBookingUrl(href: string): string {
  try {
    const url = new URL(href, "https://www.booking.com");
    // Booking.com: /hotel/jp/xxxxx.ja.html がパターン
    return `${url.origin}${url.pathname}`;
  } catch {
    return href;
  }
}
