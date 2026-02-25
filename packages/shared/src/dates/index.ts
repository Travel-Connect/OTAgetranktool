import holidayJp from "@holiday-jp/holiday_jp";

/** YYYY-MM-DD 形式の文字列 */
export type DateString = string;

/** 日付生成ルール（プリセットの rule_json に対応） */
export interface DateRule {
  /** 基準日からのオフセット月数 */
  offsetMonths: number;
  /** 対象曜日 (0=Sun, 1=Mon, ..., 6=Sat) */
  weekdays: number[];
  /** 日本の祝日を除外するか */
  excludeJpHolidays: boolean;
  /** 生成件数 */
  generateCount: number;
}

/** 月〜金 の曜日番号 */
export const WEEKDAYS_MON_FRI = [1, 2, 3, 4, 5];

/**
 * 日本の祝日かどうかを判定（振替休日・国民の休日含む）
 */
export function isJpHoliday(date: Date): boolean {
  return holidayJp.isHoliday(date);
}

/**
 * Date → YYYY-MM-DD
 */
export function formatDate(date: Date): DateString {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * YYYY-MM-DD → Date (UTC避け: ローカルタイムで解釈)
 */
export function parseDate(s: DateString): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 日付に N 月加算（月末処理: 末日にクランプ）
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  // 月末クランプ: 1/31 + 1ヶ月 → 3/3 ではなく 2/28 にする
  if (result.getDate() !== date.getDate()) {
    result.setDate(0); // 前月の末日に戻す
  }
  return result;
}

/**
 * 日付に N 日加算
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * ルールベースで日付リストを生成
 *
 * @param runDate - 基準日 (集計日)
 * @param rule - 生成ルール
 * @returns YYYY-MM-DD の配列（昇順）
 */
export function generateDates(runDate: DateString, rule: DateRule): DateString[] {
  const base = parseDate(runDate);
  const start = addMonths(base, rule.offsetMonths);
  const results: DateString[] = [];
  let current = new Date(start);

  // 最大探索日数（無限ループ防止）
  const maxIterations = 365;
  let iterations = 0;

  while (results.length < rule.generateCount && iterations < maxIterations) {
    const dow = current.getDay();

    if (rule.weekdays.includes(dow)) {
      if (!rule.excludeJpHolidays || !isJpHoliday(current)) {
        results.push(formatDate(current));
      }
    }

    current = addDays(current, 1);
    iterations++;
  }

  return results;
}
