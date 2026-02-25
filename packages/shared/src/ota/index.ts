import type { OtaType } from "../index";
import type { OtaUrlBuilder } from "./types";
import { rakutenBuilder } from "./rakuten";
import { jalanBuilder } from "./jalan";
import { ikyuBuilder } from "./ikyu";
import { expediaBuilder } from "./expedia";
import { bookingBuilder } from "./booking";
import { agodaBuilder } from "./agoda";
import { tripcomBuilder } from "./tripcom";

export type { SearchCondition, SearchProfile, OtaUrlBuilder } from "./types";
export { calcCheckoutDate } from "./types";
export { normalizeUrl, mergeUrlParams } from "./url-normalizer";

/** OTA名 → URL Builder の対応表 */
export const OTA_BUILDERS: Record<OtaType, OtaUrlBuilder> = {
  rakuten: rakutenBuilder,
  jalan: jalanBuilder,
  ikyu: ikyuBuilder,
  expedia: expediaBuilder,
  booking: bookingBuilder,
  agoda: agodaBuilder,
  tripcom: tripcomBuilder,
};
