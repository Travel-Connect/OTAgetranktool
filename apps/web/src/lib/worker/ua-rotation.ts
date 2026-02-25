/** デスクトップブラウザの User-Agent プール */
const UA_POOL = [
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "ja-JP",
  },
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    viewport: { width: 1366, height: 768 },
    locale: "ja-JP",
  },
  {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    viewport: { width: 1440, height: 900 },
    locale: "ja-JP",
  },
  {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1680, height: 1050 },
    locale: "ja-JP",
  },
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    viewport: { width: 1920, height: 1080 },
    locale: "ja",
  },
];

let currentIndex = 0;

export interface BrowserProfile {
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
}

/** ラウンドロビンで次の UA プロファイルを取得 */
export function getNextProfile(): BrowserProfile {
  const profile = UA_POOL[currentIndex % UA_POOL.length]!;
  currentIndex++;
  return profile;
}

/** テスト用: インデックスをリセット */
export function resetRotation(): void {
  currentIndex = 0;
}
