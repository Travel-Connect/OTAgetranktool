import type { OtaUrlBuilder, SearchCondition, SearchProfile } from "./types";
import { mergeUrlParams, normalizeUrl } from "./url-normalizer";

/**
 * じゃらん URL Builder
 * Endpoint: /{kenCd}/LRG_{lrgCd}/...
 */
export const jalanBuilder: OtaUrlBuilder = {
  buildUrl(condition: SearchCondition, profile: SearchProfile): string {
    const [y, m, d] = condition.checkinDate.split("-").map(Number);

    const overrides: Record<string, string | number> = {
      stayYear: y,
      stayMonth: m,
      stayDay: d,
      stayCount: condition.nights,
      roomCount: condition.rooms,
      adultNum: condition.adultsPerRoom,
      // roomCrack: adultNum * 100000 (じゃらん内部互換値)
      roomCrack: condition.adultsPerRoom * 100000,
    };

    const merged = mergeUrlParams(profile.baseUrl, overrides);
    return normalizeUrl(
      merged,
      profile.allowlistParamsJson,
      profile.denylistParamsJson,
    );
  },
};
