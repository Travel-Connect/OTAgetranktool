import type { OtaUrlBuilder, SearchCondition, SearchProfile } from "./types";
import { calcCheckoutDate } from "./types";
import { mergeUrlParams, normalizeUrl } from "./url-normalizer";

/**
 * 一休 URL Builder
 * Endpoint: /{area_slug}/{area_id}/
 */
export const ikyuBuilder: OtaUrlBuilder = {
  buildUrl(condition: SearchCondition, profile: SearchProfile): string {
    const cid = condition.checkinDate.replace(/-/g, ""); // YYYYMMDD
    const checkout = calcCheckoutDate(condition.checkinDate, condition.nights);
    const cod = checkout.replace(/-/g, ""); // YYYYMMDD

    const overrides: Record<string, string | number> = {
      cid,
      cod,
      lc: condition.nights,
      rc: condition.rooms,
      ppc: condition.adultsPerRoom,
    };

    const merged = mergeUrlParams(profile.baseUrl, overrides);
    return normalizeUrl(
      merged,
      profile.allowlistParamsJson,
      profile.denylistParamsJson,
    );
  },
};
