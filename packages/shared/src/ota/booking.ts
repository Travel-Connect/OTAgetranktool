import type { OtaUrlBuilder, SearchCondition, SearchProfile } from "./types";
import { calcCheckoutDate } from "./types";
import { mergeUrlParams, normalizeUrl } from "./url-normalizer";

/**
 * Booking.com URL Builder
 * Endpoint: /searchresults.ja.html
 * group_adults は合計人数 (adultsPerRoom * rooms)
 */
export const bookingBuilder: OtaUrlBuilder = {
  buildUrl(condition: SearchCondition, profile: SearchProfile): string {
    const checkout = calcCheckoutDate(condition.checkinDate, condition.nights);
    const totalAdults = condition.adultsPerRoom * condition.rooms;

    const overrides: Record<string, string | number> = {
      checkin: condition.checkinDate,
      checkout,
      group_adults: totalAdults,
      group_children: 0,
      no_rooms: condition.rooms,
    };

    const merged = mergeUrlParams(profile.baseUrl, overrides);
    return normalizeUrl(
      merged,
      profile.allowlistParamsJson,
      profile.denylistParamsJson,
    );
  },
};
