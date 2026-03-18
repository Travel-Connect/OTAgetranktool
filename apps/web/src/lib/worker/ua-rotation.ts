/** デスクトップブラウザの User-Agent プール (Chromium用) — 2026-03 更新 */
const CHROMIUM_UA_POOL = [
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "ja-JP",
  },
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
    viewport: { width: 1366, height: 768 },
    locale: "ja-JP",
  },
  {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15",
    viewport: { width: 1440, height: 900 },
    locale: "ja-JP",
  },
  {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    viewport: { width: 1680, height: 1050 },
    locale: "ja-JP",
  },
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
    viewport: { width: 1920, height: 1080 },
    locale: "ja",
  },
];

/** Firefox用 User-Agent プール (TLSフィンガープリントと一致させる) — 2026-03 更新 */
const FIREFOX_UA_POOL = [
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
    viewport: { width: 1920, height: 1080 },
    locale: "ja",
  },
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
    viewport: { width: 1366, height: 768 },
    locale: "ja-JP",
  },
  {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15.3; rv:136.0) Gecko/20100101 Firefox/136.0",
    viewport: { width: 1440, height: 900 },
    locale: "ja-JP",
  },
];

let currentIndex = 0;

export interface BrowserProfile {
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
}

/** ラウンドロビンで次の UA プロファイルを取得 */
export function getNextProfile(engine: "chromium" | "firefox" = "chromium"): BrowserProfile {
  const pool = engine === "firefox" ? FIREFOX_UA_POOL : CHROMIUM_UA_POOL;
  const profile = pool[currentIndex % pool.length]!;
  currentIndex++;
  return profile;
}

/** テスト用: インデックスをリセット */
export function resetRotation(): void {
  currentIndex = 0;
}
