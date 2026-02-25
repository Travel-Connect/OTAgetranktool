/**
 * ドメイン別速度制限
 * 同一ドメインへの連続アクセスに最小間隔 + ランダムジッターを挿入
 */

/** ドメイン別のデフォルト最小間隔 (ms) */
const DOMAIN_INTERVALS: Record<string, number> = {
  "search.travel.rakuten.co.jp": 2000,
  "www.jalan.net": 2000,
  "www.ikyu.com": 2000,
  "www.expedia.co.jp": 2500,
  "www.booking.com": 2500,
  "www.agoda.com": 3000,
  "jp.trip.com": 2500,
};

const DEFAULT_INTERVAL = 2000;
const JITTER_RANGE = 1500; // 0〜1500ms のランダム加算

/** ドメインごとの最終アクセス時刻 */
const lastAccessMap = new Map<string, number>();

/** URL からドメインを抽出 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

/** ジッター付きの待機時間を算出 */
function calcWaitMs(domain: string): number {
  const interval = DOMAIN_INTERVALS[domain] ?? DEFAULT_INTERVAL;
  const jitter = Math.floor(Math.random() * JITTER_RANGE);
  return interval + jitter;
}

/**
 * 必要に応じて待機してからアクセスを許可する
 * @returns 実際に待機した時間 (ms)
 */
export async function waitForDomain(url: string): Promise<number> {
  const domain = extractDomain(url);
  const now = Date.now();
  const lastAccess = lastAccessMap.get(domain) ?? 0;
  const required = calcWaitMs(domain);
  const elapsed = now - lastAccess;

  if (elapsed < required) {
    const waitMs = required - elapsed;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastAccessMap.set(domain, Date.now());
    return waitMs;
  }

  lastAccessMap.set(domain, now);
  return 0;
}

/** テスト用: 状態をリセット */
export function resetRateLimiter(): void {
  lastAccessMap.clear();
}
