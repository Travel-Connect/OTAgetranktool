import ExcelJS from "exceljs";
import { OTA_LIST, type OtaType } from "@ota/shared";

interface TaskWithResult {
  ota: string;
  checkin_date: string;
  adults_per_room: number;
  nights: number;
  rooms: number;
  task_results: {
    total_count_int: number | null;
    ranks_json: Record<string, number | null>;
  } | null;
}

interface Hotel {
  id: string;
  display_name: string;
}

interface ExcelInput {
  runDate: string;
  projectName: string;
  nights: number;
  rooms: number;
  hotels: Hotel[];
  tasks: TaskWithResult[];
}

/**
 * Excel出力: 1ファイル = 1ジョブ, シート = OTA ごと
 */
export async function buildExcel(input: ExcelInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OTA Get Rank Tool";

  for (const ota of OTA_LIST) {
    const otaTasks = input.tasks.filter((t) => t.ota === ota);
    if (otaTasks.length === 0) continue;

    const sheet = workbook.addWorksheet(otaDisplayName(ota));

    // ヘッダ情報
    sheet.addRow(["集計日", input.runDate]);
    sheet.addRow(["エリア", input.projectName]);
    sheet.addRow(["泊数", input.nights]);
    sheet.addRow(["室数", input.rooms]);
    sheet.addRow(["広告除外", "あり"]);
    sheet.addRow(["圏外閾値", 100]);
    sheet.addRow([]);

    // 人数ごとのセクション
    const adultsSet = [...new Set(otaTasks.map((t) => t.adults_per_room))].sort();

    for (const adults of adultsSet) {
      const sectionTasks = otaTasks.filter((t) => t.adults_per_room === adults);
      const dates = [...new Set(sectionTasks.map((t) => t.checkin_date))].sort();

      sheet.addRow([`${adults}名/室`]).font = { bold: true };

      // テーブルヘッダ: ホテル名 | 日付...
      const headerRow = sheet.addRow(["ホテル", ...dates]);
      headerRow.font = { bold: true };

      // ホテル行
      for (const hotel of input.hotels) {
        const row: (string | number)[] = [hotel.display_name];
        for (const date of dates) {
          const task = sectionTasks.find((t) => t.checkin_date === date);
          const rank = task?.task_results?.ranks_json?.[hotel.id];
          row.push(rank === null || rank === undefined ? "-" : rank);
        }
        sheet.addRow(row);
      }

      // 総件数行
      const countRow: (string | number)[] = ["総件数"];
      for (const date of dates) {
        const task = sectionTasks.find((t) => t.checkin_date === date);
        const count = task?.task_results?.total_count_int;
        countRow.push(count ?? "");
      }
      sheet.addRow(countRow);
      sheet.addRow([]);
    }

    // カラム幅調整
    sheet.columns.forEach((col) => {
      col.width = 14;
    });
    if (sheet.columns[0]) sheet.columns[0].width = 20;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function otaDisplayName(ota: OtaType): string {
  const names: Record<OtaType, string> = {
    rakuten: "楽天トラベル",
    jalan: "じゃらん",
    ikyu: "一休",
    expedia: "Expedia",
    booking: "Booking.com",
    agoda: "Agoda",
    tripcom: "Trip.com",
  };
  return names[ota];
}
