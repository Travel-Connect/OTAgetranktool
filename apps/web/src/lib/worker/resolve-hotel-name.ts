import type { OtaType } from "@ota/shared";
import { acquireWorkerContext, closeBrowser } from "./browser-pool";

/**
 * OTA施設ページからホテル名を自動取得する
 *
 * @param ota - OTA種別
 * @param propertyUrl - 施設ページURL (正規化済みでなくてもOK)
 * @returns ホテル名 or null
 */
export async function resolveHotelName(
  ota: OtaType,
  propertyUrl: string,
): Promise<string | null> {
  const worker = await acquireWorkerContext();
  try {
    const { page } = worker;

    // OTAごとの waitUntil
    const waitUntil = SPA_OTAS.has(ota) ? "networkidle" as const : "domcontentloaded" as const;

    await page.goto(propertyUrl, { waitUntil, timeout: 20000 });

    // SPAは追加で待機
    if (SPA_OTAS.has(ota)) {
      await page.waitForTimeout(2000);
    }

    const name = await page.evaluate((otaType: string) => {
      // OTA固有セレクタ (優先)
      const otaSelectors: Record<string, string[]> = {
        rakuten: ['h1#hotelName', '.hotelName h1'],
        jalan: ['h1.p-hotelHeader__hotelName'],
        ikyu: ['h1[class*="hotelName"]'],
        booking: ['h2.pp-header__title', 'h2.d2fee87262'],
        expedia: ['h1[data-stid="content-hotel-title"]'],
        agoda: ['h1[data-selenium="hotel-header-name"]'],
        tripcom: ['h1.headInit_name'],
      };

      const selectors = otaSelectors[otaType] ?? [];

      // OTA固有のサフィックス除去パターン
      // OTA固有 + 汎用のサフィックス/プレフィックス除去パターン
      const commonPatterns: RegExp[] = [
        /\s*の宿泊予約.*$/,
        /\s*宿泊予約.*$/,
        /\s*の施設(情報|概要|詳細)$/,
        /\s*の(口コミ|クチコミ).*$/,
        /\s*の(料金|価格).*$/,
        /\s*[\[【（(].*(予約|公式|格安|最安).*[\]】）)]\s*$/,
      ];
      const suffixPatterns: Record<string, RegExp[]> = {
        rakuten: [/^楽天トラベル:\s*/, /\s*[-–—]\s*楽天トラベル$/],
        jalan: [/\s*[-–—]\s*じゃらん.*$/],
        booking: [/\s*[-–—]\s*Booking\.com$/],
        expedia: [/\s*[-–—]\s*Expedia.*$/],
        agoda: [/\s*[-–—]\s*Agoda.*$/],
        tripcom: [/\s*[-–—]\s*Trip\.com.*$/],
      };

      function cleanName(raw: string): string {
        let cleaned = raw.trim();
        // OTA固有パターン
        const otaPatterns = suffixPatterns[otaType] ?? [];
        for (const p of otaPatterns) {
          cleaned = cleaned.replace(p, "");
        }
        // 汎用パターン
        for (const p of commonPatterns) {
          cleaned = cleaned.replace(p, "");
        }
        return cleaned.trim();
      }

      // 1. OTA固有セレクタを試行
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const text = el?.textContent?.trim();
        if (text && text.length >= 2 && text.length <= 100) return cleanName(text);
      }

      // 2. og:title フォールバック
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        const content = ogTitle.getAttribute("content")?.trim();
        if (content) {
          const parts = content.split(/\s*[|｜\-–—]\s*/);
          if (parts[0] && parts[0].length >= 2) return cleanName(parts[0]);
        }
      }

      // 3. <title> フォールバック
      const title = document.title.trim();
      if (title) {
        const parts = title.split(/\s*[|｜\-–—]\s*/);
        if (parts[0] && parts[0].length >= 2) return cleanName(parts[0]);
      }

      return null;
    }, ota);

    return name;
  } catch {
    return null;
  } finally {
    await worker.release();
  }
}

/** SPA方式のOTA (networkidle + 追加待機が必要) */
const SPA_OTAS = new Set<string>(["ikyu", "agoda", "tripcom"]);

/**
 * 複数OTA URLからホテル名を解決 (最初に成功したものを返す)
 */
export async function resolveHotelNameFromMappings(
  mappings: Array<{ ota: OtaType; propertyUrl: string }>,
): Promise<{ name: string; ota: OtaType } | null> {
  for (const { ota, propertyUrl } of mappings) {
    const name = await resolveHotelName(ota, propertyUrl);
    if (name) return { name, ota };
  }
  return null;
}
