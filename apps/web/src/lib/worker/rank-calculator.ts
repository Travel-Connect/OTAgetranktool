import type { ListItem } from "./extractor-types";

/** 自然順位の結果 */
export interface RankResult {
  /** hotel_id → 自然順位 (null = 圏外) */
  ranks: Record<string, number | null>;
  /** 何位までスキャンしたか（最大100） */
  scannedNaturalCount: number;
  /** デバッグ用: 先頭5件の抜粋 */
  debugItemsSample: Array<{ name?: string; url: string; naturalRank: number }>;
}

/** 自然順位上限 */
const MAX_NATURAL_RANK = 100;

/**
 * 自然順位を算出
 *
 * @param allItems - 全ページから収集した一覧アイテム（表示順）
 * @param hotelUrlMap - hotel_id → [正規化済み施設URL] のマップ
 * @returns 各ホテルの自然順位
 */
export function calculateNaturalRanks(
  allItems: ListItem[],
  hotelUrlMap: Map<string, string[]>,
): RankResult {
  const ranks: Record<string, number | null> = {};
  const debugSample: RankResult["debugItemsSample"] = [];

  // 初期値: 全ホテルを圏外に
  for (const hotelId of hotelUrlMap.keys()) {
    ranks[hotelId] = null;
  }

  let naturalRank = 0;

  for (const item of allItems) {
    // 広告はスキップ
    if (item.isAd) continue;

    naturalRank++;

    // デバッグ用: 先頭5件
    if (debugSample.length < 5) {
      debugSample.push({
        name: item.name,
        url: item.propertyUrl,
        naturalRank,
      });
    }

    // 施設同定: URL一致でホテルを特定
    for (const [hotelId, urls] of hotelUrlMap) {
      if (ranks[hotelId] !== null) continue; // 既にヒット済み
      if (urls.some((u) => urlMatch(item.propertyUrl, u))) {
        ranks[hotelId] = naturalRank;
      }
    }

    // 100位到達で探索停止
    if (naturalRank >= MAX_NATURAL_RANK) break;
  }

  return {
    ranks,
    scannedNaturalCount: Math.min(naturalRank, MAX_NATURAL_RANK),
    debugItemsSample: debugSample,
  };
}

/**
 * 施設URL同定: パス部分で一致判定（末尾スラッシュの有無を吸収）
 */
function urlMatch(extracted: string, registered: string): boolean {
  const normalize = (s: string): string => {
    try {
      const url = new URL(s);
      // パスの末尾スラッシュを統一
      const path = url.pathname.replace(/\/+$/, "");
      return `${url.hostname}${path}`.toLowerCase();
    } catch {
      return s.toLowerCase().replace(/\/+$/, "");
    }
  };
  return normalize(extracted) === normalize(registered);
}
