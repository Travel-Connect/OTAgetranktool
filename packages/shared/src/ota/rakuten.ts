import type { OtaUrlBuilder, SearchCondition, SearchProfile } from "./types";
import { calcCheckoutDate } from "./types";
import { mergeUrlParams, normalizeUrl } from "./url-normalizer";

/**
 * 楽天トラベル URL Builder
 * Endpoint: /ds/vacant/searchVacant
 */
export const rakutenBuilder: OtaUrlBuilder = {
  buildUrl(condition: SearchCondition, profile: SearchProfile): string {
    const [ciY, ciM, ciD] = condition.checkinDate.split("-").map(Number);
    const checkout = calcCheckoutDate(condition.checkinDate, condition.nights);
    const [coY, coM, coD] = checkout.split("-").map(Number);

    const overrides: Record<string, string | number> = {
      f_nen1: ciY,
      f_tuki1: ciM,
      f_hi1: ciD,
      f_nen2: coY,
      f_tuki2: coM,
      f_hi2: coD,
      f_heya_su: condition.rooms,
      f_otona_su: condition.adultsPerRoom,
      // 子供: 0 固定 (v1.1)
      f_s1: 0,
      f_s2: 0,
      f_y1: 0,
      f_y2: 0,
      f_y3: 0,
      f_y4: 0,
    };

    const merged = mergeUrlParams(profile.baseUrl, overrides);
    return normalizeUrl(
      merged,
      profile.allowlistParamsJson,
      profile.denylistParamsJson,
    );
  },
};
