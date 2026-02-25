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
