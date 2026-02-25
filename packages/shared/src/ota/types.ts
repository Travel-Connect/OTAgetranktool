import type { OtaType } from "../index";
import type { DateString } from "../dates";

/** URL Builder への入力（全OTA共通） */
export interface SearchCondition {
  checkinDate: DateString;
  nights: number;
  rooms: number;
  adultsPerRoom: number;
}

/** OTA検索プロファイル（DB ota_search_profiles の必要フィールド） */
export interface SearchProfile {
  ota: OtaType;
  baseUrl: string;
  variableMappingJson: Record<string, unknown>;
  allowlistParamsJson?: string[] | null;
  denylistParamsJson?: string[] | null;
}

/** URL Builder の共通インターフェース */
export interface OtaUrlBuilder {
  /** 検索条件 + プロファイル → 巡回用URL */
  buildUrl(condition: SearchCondition, profile: SearchProfile): string;
}

/** checkout 日を算出 */
export function calcCheckoutDate(checkinDate: DateString, nights: number): DateString {
  const [y, m, d] = checkinDate.split("-").map(Number);
  const date = new Date(y, m - 1, d + nights);
  const oy = date.getFullYear();
  const om = String(date.getMonth() + 1).padStart(2, "0");
  const od = String(date.getDate()).padStart(2, "0");
  return `${oy}-${om}-${od}`;
}
