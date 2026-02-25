import type { OtaUrlBuilder, SearchCondition, SearchProfile } from "./types";
import { calcCheckoutDate } from "./types";
import { mergeUrlParams, normalizeUrl } from "./url-normalizer";

/**
 * Agoda URL Builder
 * Endpoint: /ja-jp/search
 * adults は合計人数 (adultsPerRoom * rooms)
 */
export const agodaBuilder: OtaUrlBuilder = {
  buildUrl(condition: SearchCondition, profile: SearchProfile): string {
    const checkout = calcCheckoutDate(condition.checkinDate, condition.nights);
    const totalAdults = condition.adultsPerRoom * condition.rooms;

    const overrides: Record<string, string | number> = {
      checkIn: condition.checkinDate,
      checkOut: checkout,
      los: condition.nights,
      rooms: condition.rooms,
      adults: totalAdults,
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
