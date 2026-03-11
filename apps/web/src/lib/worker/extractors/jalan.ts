import type { Page } from "playwright";
import type { OtaExtractor, PageExtraction, ListItem } from "../extractor-types";

/**
 * じゃらん Extractor
 *
 * じゃらんはSSR（Java系サーバサイド、Shift_JIS）:
 * - 総件数: span.jlnpc-listInformation--count
 * - 通常アイテム: ol > li.p-yadoCassette (30件/ページ)
 * - PR(広告)アイテム: li.p-yadoCassette--pr (ulの中、先頭に1件)
 * - ホテル名: h2.p-searchResultItem__facilityName
 * - ホテルリンク: a.jlnpc-yadoCassette__link (href="/yad{yadNo}/?...")
 * - PR判定: li要素に p-yadoCassette--pr クラス / id が sa_ プレフィックス
 * - ページネーション: パスベース page2.html, page3.html ...
 * - 次ページ判定: a.next 要素の存在
 */

const ITEMS_PER_PAGE = 30;

export const jalanExtractor: OtaExtractor = {
  ota: "jalan",
  itemsPerPage: 30,
  waitUntil: "domcontentloaded", // SSRのため

  async extractPage(page: Page): Promise<PageExtraction> {
    // SSRだがDOM完全ロードを待つ
    await page
      .waitForSelector("li.p-yadoCassette", { timeout: 15000 })
      .catch(() => {});

    // page.evaluate() で一括抽出
    const extracted = await page.evaluate(() => {
      // === 1. 総件数 ===
      let totalCount: number | null = null;
      let totalCountRawText: string | null = null;

      const countEl = document.querySelector(".jlnpc-listInformation--count");
      if (countEl) {
        const text = countEl.textContent?.trim() || "";
        const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(num)) {
          totalCount = num;
          totalCountRawText = `${num}軒`;
        }
      }

      // === 2. ホテルアイテム収集 ===
      const items: Array<{
        yadNo: string;
        name: string | null;
        isAd: boolean;
      }> = [];

      // 重複排除用セット（PR+通常の両方に同じホテルが出る場合がある）
      const seenYadNos = new Set<string>();

      const allCards = document.querySelectorAll("li.p-yadoCassette");

      for (const card of allCards) {
        // 広告判定: --pr クラス or id が sa_ プレフィックス
        const isPr =
          card.classList.contains("p-yadoCassette--pr") ||
          (card.id || "").startsWith("sa_");

        // yadNo 取得: カードの id 属性から (yadNo12345 or sa_yadNo12345)
        const cardId = card.id || "";
        const yadNoFromId = cardId.replace(/^sa_/, "").replace(/^yadNo/, "");

        // ホテル名
        const nameEl = card.querySelector("h2.p-searchResultItem__facilityName");
        const name = nameEl?.textContent?.trim() || null;

        // yadNo をリンクからも取得（フォールバック）
        let yadNo = yadNoFromId;
        if (!yadNo) {
          const link = card.querySelector("a.jlnpc-yadoCassette__link") as HTMLAnchorElement | null;
          if (link?.href) {
            const m = link.href.match(/\/yad(\d+)/);
            if (m) yadNo = m[1];
          }
        }

        if (!yadNo) continue;

        // PRと通常の両方に出現する場合、通常側を優先
        if (seenYadNos.has(yadNo)) {
          // 既に通常で登録済みならスキップ
          // 既にPRで登録済みで今回通常ならPRエントリを更新
          if (!isPr) {
            const idx = items.findIndex((i) => i.yadNo === yadNo);
            if (idx >= 0) items[idx].isAd = false;
          }
          continue;
        }
        seenYadNos.add(yadNo);

        items.push({ yadNo, name, isAd: isPr });
      }

      // === 3. 次ページ判定 ===
      const hasNext = document.querySelector("a.next") !== null;

      return { totalCount, totalCountRawText, items, hasNext };
    });

    // ListItem 形式に変換
    const items: ListItem[] = extracted.items.map((item) => ({
      propertyUrl: normalizeJalanUrl(item.yadNo),
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
    // じゃらんはパスベース: /470000/LRG_471100/page2.html
    // クエリパラメータも保持する必要がある（stayYear等）
    const url = new URL(currentUrl);

    // 既存の pageN.html を除去
    url.pathname = url.pathname.replace(/page\d+\.html$/, "");
    // 末尾スラッシュ統一
    if (!url.pathname.endsWith("/")) {
      url.pathname += "/";
    }

    const nextPage = currentPage + 1;
    if (nextPage > 1) {
      url.pathname += `page${nextPage}.html`;
    }

    return url.toString();
  },

  getPageUrl(baseUrl: string, pageNumber: number): string {
    const url = new URL(baseUrl);
    url.pathname = url.pathname.replace(/page\d+\.html$/, "");
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    if (pageNumber > 1) url.pathname += `page${pageNumber}.html`;
    return url.toString();
  },
};

/**
 * じゃらん URL正規化: yadNoベースの統一形式に変換
 *
 * - yadNo数字のみ: 396620 → /yad396620/
 * - 施設ページURL: /yad396620/?stayYear=... → /yad396620/
 * - 任意のURL形式: https://www.jalan.net/yad396620/plan/ → /yad396620/
 */
export function normalizeJalanUrl(yadNoOrHref: string): string {
  // 数字のみの場合はyadNoとして直接構築
  if (/^\d+$/.test(yadNoOrHref)) {
    return `https://www.jalan.net/yad${yadNoOrHref}/`;
  }

  try {
    const url = new URL(yadNoOrHref, "https://www.jalan.net");
    const match = url.pathname.match(/\/yad(\d+)/);
    if (match) {
      return `https://www.jalan.net/yad${match[1]}/`;
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return yadNoOrHref;
  }
}
