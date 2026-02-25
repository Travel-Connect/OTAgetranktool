import type { OtaType } from "@ota/shared";
import type { OtaExtractor } from "../extractor-types";
import { rakutenExtractor } from "./rakuten";
import { jalanExtractor } from "./jalan";
import { ikyuExtractor } from "./ikyu";
import { expediaExtractor } from "./expedia";
import { bookingExtractor } from "./booking";
import { agodaExtractor } from "./agoda";
import { tripcomExtractor } from "./tripcom";

export const OTA_EXTRACTORS: Record<OtaType, OtaExtractor> = {
  rakuten: rakutenExtractor,
  jalan: jalanExtractor,
  ikyu: ikyuExtractor,
  expedia: expediaExtractor,
  booking: bookingExtractor,
  agoda: agodaExtractor,
  tripcom: tripcomExtractor,
};
