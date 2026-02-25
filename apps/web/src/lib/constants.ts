import type { OtaType } from "@ota/shared";

export const OTA_LIST = [
  "rakuten", "jalan", "ikyu", "expedia", "booking", "agoda", "tripcom",
] as const;

export const OTA_DISPLAY_NAMES: Record<OtaType, string> = {
  rakuten: "楽天トラベル",
  jalan: "じゃらん",
  ikyu: "一休",
  expedia: "Expedia",
  booking: "Booking.com",
  agoda: "Agoda",
  tripcom: "Trip.com",
};

export const STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-400",
  running: "bg-orange-500",
  success: "bg-green-600",
  partial: "bg-yellow-500",
  failed: "bg-red-600",
  skipped: "bg-gray-300",
};

export const STATUS_LABELS: Record<string, string> = {
  queued: "待機中",
  running: "実行中",
  success: "成功",
  partial: "一部成功",
  failed: "失敗",
  skipped: "スキップ",
};
