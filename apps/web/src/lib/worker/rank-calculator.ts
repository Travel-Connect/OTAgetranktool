import type { ListItem } from "./extractor-types";

/** 順位の結果 */
export interface RankResult {
  /** hotel_id → 自然順位 (null = 圏外) — 広告を除外した順位 */
  ranks: Record<string, number | null>;
  /** hotel_id → 表示順位 (null = 圏外) — 広告含む画面表示順 */
  displayRanks: Record<string, number | null>;
  /** 何位までスキャンしたか（自然順位、最大200） */
  scannedNaturalCount: number;
  /** 何件までスキャンしたか（表示順位、広告含む） */
  scannedDisplayCount: number;
  /** デバッグ用: 先頭5件の抜粋 */
  debugItemsSample: Array<{ name?: string; url: string; naturalRank: number; displayRank: number; isAd: boolean }>;
}

/** 自然順位上限 */
const MAX_NATURAL_RANK = 200;

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
  const displayRanks: Record<string, number | null> = {};
  const debugSample: RankResult["debugItemsSample"] = [];

  // 初期値: 全ホテルを圏外に
  for (const hotelId of hotelUrlMap.keys()) {
    ranks[hotelId] = null;
    displayRanks[hotelId] = null;
  }

  let naturalRank = 0;
  let displayRank = 0;

  for (const item of allItems) {
    // 表示順位: 広告含む全アイテムをカウント
    displayRank++;

    // 施設同定（表示順位）: URL一致でホテルを特定
    for (const [hotelId, urls] of hotelUrlMap) {
      if (displayRanks[hotelId] !== null) continue; // 既にヒット済み
      if (urls.some((u) => urlMatch(item.propertyUrl, u))) {
        displayRanks[hotelId] = displayRank;
      }
    }

    // 自然順位: 広告はスキップ
    if (!item.isAd) {
      naturalRank++;

      // 施設同定（自然順位）: URL一致でホテルを特定
      for (const [hotelId, urls] of hotelUrlMap) {
        if (ranks[hotelId] !== null) continue; // 既にヒット済み
        if (urls.some((u) => urlMatch(item.propertyUrl, u))) {
          ranks[hotelId] = naturalRank;
        }
      }
    }

    // デバッグ用: 先頭5件
    if (debugSample.length < 5) {
      debugSample.push({
        name: item.name,
        url: item.propertyUrl,
        naturalRank: item.isAd ? 0 : naturalRank,
        displayRank,
        isAd: item.isAd,
      });
    }

    // 自然順位100位到達で探索停止
    if (naturalRank >= MAX_NATURAL_RANK) break;
  }

  return {
    ranks,
    displayRanks,
    scannedNaturalCount: Math.min(naturalRank, MAX_NATURAL_RANK),
    scannedDisplayCount: displayRank,
    debugItemsSample: debugSample,
  };
}

/**
 * 順位結果からページネーションヒントを生成
 */
export function generatePaginationHints(
  rankResult: RankResult,
  itemsPerPage: number,
): Record<string, { displayRank: number; pageNumber: number }> {
  const hints: Record<string, { displayRank: number; pageNumber: number }> = {};
  for (const [hotelId, rank] of Object.entries(rankResult.displayRanks)) {
    if (rank !== null) {
      hints[hotelId] = {
        displayRank: rank,
        pageNumber: Math.ceil(rank / itemsPerPage),
      };
    }
  }
  return hints;
}

/**
 * 施設URL同定: パス部分で一致判定（末尾スラッシュの有無を吸収）
 */
export function urlMatch(extracted: string, registered: string): boolean {
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
