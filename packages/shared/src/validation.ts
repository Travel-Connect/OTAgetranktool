import type { SearchCondition } from "./ota/types";
import { parseDate } from "./dates";
import { calcCheckoutDate } from "./ota/types";

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * 検索条件のバリデーション
 * @returns エラー配列（空なら有効）
 */
export function validateSearchCondition(cond: SearchCondition): ValidationError[] {
  const errors: ValidationError[] = [];

  // checkinDate 形式チェック
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cond.checkinDate)) {
    errors.push({ field: "checkinDate", message: "YYYY-MM-DD 形式で指定してください" });
  } else {
    const ci = parseDate(cond.checkinDate);
    if (isNaN(ci.getTime())) {
      errors.push({ field: "checkinDate", message: "無効な日付です" });
    }
  }

  // nights
  if (!Number.isInteger(cond.nights) || cond.nights < 1) {
    errors.push({ field: "nights", message: "1以上の整数を指定してください" });
  }

  // rooms
  if (!Number.isInteger(cond.rooms) || cond.rooms < 1) {
    errors.push({ field: "rooms", message: "1以上の整数を指定してください" });
  }

  // adultsPerRoom
  if (!Number.isInteger(cond.adultsPerRoom) || cond.adultsPerRoom < 1) {
    errors.push({ field: "adultsPerRoom", message: "1以上の整数を指定してください" });
  }

  // checkin < checkout (論理チェック)
  if (errors.length === 0) {
    const checkout = calcCheckoutDate(cond.checkinDate, cond.nights);
    if (cond.checkinDate >= checkout) {
      errors.push({ field: "checkinDate", message: "チェックイン日はチェックアウト日より前である必要があります" });
    }
  }

  return errors;
}
