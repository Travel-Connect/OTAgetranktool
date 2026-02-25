import type { OtaUrlBuilder, SearchCondition, SearchProfile } from "./types";
import { calcCheckoutDate } from "./types";
import { mergeUrlParams, normalizeUrl } from "./url-normalizer";

/**
 * Expedia URL Builder
 * Endpoint: /Hotel-Search
 * adults は合計人数 (adultsPerRoom * rooms)
 */
export const expediaBuilder: OtaUrlBuilder = {
  buildUrl(condition: SearchCondition, profile: SearchProfile): string {
    const checkout = calcCheckoutDate(condition.checkinDate, condition.nights);
    const totalAdults = condition.adultsPerRoom * condition.rooms;

    const overrides: Record<string, string | number> = {
      startDate: condition.checkinDate,
      endDate: checkout,
      d1: condition.checkinDate,
      d2: checkout,
      adults: totalAdults,
      rooms: condition.rooms,
    };

    const merged = mergeUrlParams(profile.baseUrl, overrides);
    return normalizeUrl(
      merged,
      profile.allowlistParamsJson,
      profile.denylistParamsJson,
    );
  },
};
