/**
 * URL正規化: allowlist/denylist に基づきクエリパラメータをフィルタ
 *
 * - allowlist あり → allowlist にあるキーのみ残す
 * - denylist あり → denylist にあるキーを除去
 * - 両方あり → allowlist 優先（allowlistに入っているもののみ残す）
 * - どちらも無し → 全パラメータ残す
 */
export function normalizeUrl(
  url: string,
  allowlist?: string[] | null,
  denylist?: string[] | null,
): string {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const filtered = new URLSearchParams();

  if (allowlist && allowlist.length > 0) {
    const set = new Set(allowlist);
    for (const [key, value] of params) {
      if (set.has(key)) {
        filtered.append(key, value);
      }
    }
  } else if (denylist && denylist.length > 0) {
    const set = new Set(denylist);
    for (const [key, value] of params) {
      if (!set.has(key)) {
        filtered.append(key, value);
      }
    }
  } else {
    // パススルー
    for (const [key, value] of params) {
      filtered.append(key, value);
    }
  }

  parsed.search = filtered.toString();
  return parsed.toString();
}

/**
 * base_url のクエリパラメータを上書き・追加する
 * 既存の同名パラメータは上書きされる
 */
export function mergeUrlParams(
  baseUrl: string,
  overrides: Record<string, string | number>,
): string {
  const parsed = new URL(baseUrl);
  const params = new URLSearchParams(parsed.search);

  for (const [key, value] of Object.entries(overrides)) {
    params.set(key, String(value));
  }

  parsed.search = params.toString();
  return parsed.toString();
}
