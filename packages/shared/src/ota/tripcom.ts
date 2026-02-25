import type { OtaUrlBuilder, SearchCondition, SearchProfile } from "./types";
import { calcCheckoutDate } from "./types";
import { mergeUrlParams, normalizeUrl } from "./url-normalizer";

/**
 * Trip.com URL Builder
 * Endpoint: /hotels/list
 * adult は合計人数 (adultsPerRoom * rooms)
 * 目的地系パラメータ (searchType/searchValue/searchWord) は base_url 固定
 */
export const tripcomBuilder: OtaUrlBuilder = {
  buildUrl(condition: SearchCondition, profile: SearchProfile): string {
    const checkout = calcCheckoutDate(condition.checkinDate, condition.nights);
    const totalAdults = condition.adultsPerRoom * condition.rooms;

    const overrides: Record<string, string | number> = {
      checkIn: condition.checkinDate,
      checkOut: checkout,
      crn: condition.rooms,
      adult: totalAdults,
      children: 0,
    };

    const merged = mergeUrlParams(profile.baseUrl, overrides);
    return normalizeUrl(
      merged,
      profile.allowlistParamsJson,
      profile.denylistParamsJson,
    );
  },
};
