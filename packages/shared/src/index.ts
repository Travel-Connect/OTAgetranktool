// OTA Get Rank Tool — shared package
export const OTA_LIST = [
  "rakuten",
  "jalan",
  "ikyu",
  "expedia",
  "booking",
  "agoda",
  "tripcom",
] as const;

export type OtaType = (typeof OTA_LIST)[number];

// Dates
export {
  generateDates,
  formatDate,
  parseDate,
  addMonths,
  addDays,
  isJpHoliday,
  WEEKDAYS_MON_FRI,
  type DateString,
  type DateRule,
} from "./dates";

// OTA URL Builders
export {
  OTA_BUILDERS,
  calcCheckoutDate,
  normalizeUrl,
  mergeUrlParams,
  type SearchCondition,
  type SearchProfile,
  type OtaUrlBuilder,
} from "./ota";

// Validation
export { validateSearchCondition, type ValidationError } from "./validation";

// Supabase client
export { createBrowserClient, createServiceClient } from "./supabase";
