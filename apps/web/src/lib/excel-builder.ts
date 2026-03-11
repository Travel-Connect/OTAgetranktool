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
    display_ranks_json?: Record<string, number | null>;
  } | null;
}

interface Hotel {
  id: string;
  display_name: string;
}

interface ExcelInput {
  runDate: string;
  projectName: string;
  areaLabel?: string;
  nights: number;
  rooms: number;
  hotels: Hotel[];
  tasks: TaskWithResult[];
}

/**
 * Excel出力: 全OTAを1シートにまとめる
 *
 * 構造:
 *   集計日 YYYY/M/D 条件:エリア名
 *   (空行)
 *   OTA名
 *   N名利用時/表示件数  [件数...]
 *   施設名/宿泊日        [日付...]   ← 各OTAの1名利用時のみ表示
 *   ホテルA               [順位...]
 *   ホテルB               [順位...]
 *   (空行)
 *   N名利用時/表示件数  [件数...]
 *   ホテルA               [順位...]
 *   ...
 */
export async function buildExcel(input: ExcelInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OTA Get Rank Tool";

  const sheet = workbook.addWorksheet("順位一覧");

  // 全タスクから日付一覧を取得（ソート済み）
  const allDates = [...new Set(input.tasks.map((t) => t.checkin_date))].sort();

  // 日付フォーマット: "2026-03-01" → "3月1日"
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  // ── ヘッダ行 ──
  const runD = new Date(input.runDate + "T00:00:00");
  const area = input.areaLabel || input.projectName;
  const headerText = `集計日${runD.getFullYear()}/${runD.getMonth() + 1}/${runD.getDate()} 条件:${area}`;
  const headerRow = sheet.getRow(1);
  headerRow.getCell(2).value = headerText;
  headerRow.getCell(2).font = { bold: true };

  let currentRow = 3; // 3行目から開始（1行目ヘッダ、2行目空行）

  for (const ota of OTA_LIST) {
    const otaTasks = input.tasks.filter((t) => t.ota === ota);
    if (otaTasks.length === 0) continue;

    const adultsSet = [...new Set(otaTasks.map((t) => t.adults_per_room))].sort((a, b) => a - b);
    // このOTAで使われている日付
    const otaDates = allDates.filter((d) =>
      otaTasks.some((t) => t.checkin_date === d),
    );
    if (otaDates.length === 0) continue;

    // OTA名行
    const otaRow = sheet.getRow(currentRow);
    otaRow.getCell(2).value = otaDisplayName(ota as OtaType);
    otaRow.getCell(2).font = { bold: true, size: 12 };
    currentRow++;

    for (let adultIdx = 0; adultIdx < adultsSet.length; adultIdx++) {
      const adults = adultsSet[adultIdx];
      const sectionTasks = otaTasks.filter((t) => t.adults_per_room === adults);

      // "N名利用時/表示件数" 行
      const countLabelRow = sheet.getRow(currentRow);
      countLabelRow.getCell(2).value = `${adults}名利用時/表示件数`;
      countLabelRow.getCell(2).font = { bold: true };
      for (let i = 0; i < otaDates.length; i++) {
        const task = sectionTasks.find((t) => t.checkin_date === otaDates[i]);
        const count = task?.task_results?.total_count_int;
        countLabelRow.getCell(3 + i).value = count ?? "";
      }
      currentRow++;

      // "施設名/宿泊日" + 日付ヘッダ行 — 各OTAの最初の人数グループのみ表示
      if (adultIdx === 0) {
        const dateHeaderRow = sheet.getRow(currentRow);
        dateHeaderRow.getCell(2).value = "施設名/宿泊日";
        dateHeaderRow.getCell(2).font = { bold: true };
        for (let i = 0; i < otaDates.length; i++) {
          dateHeaderRow.getCell(3 + i).value = formatDate(otaDates[i]);
        }
        currentRow++;
      }

      // ホテル行（表示順位 = display_ranks_json）
      for (const hotel of input.hotels) {
        const hotelRow = sheet.getRow(currentRow);
        hotelRow.getCell(2).value = hotel.display_name;
        for (let i = 0; i < otaDates.length; i++) {
          const task = sectionTasks.find((t) => t.checkin_date === otaDates[i]);
          const rank = task?.task_results?.display_ranks_json?.[hotel.id];
          hotelRow.getCell(3 + i).value =
            rank === null || rank === undefined ? "-" : rank;
        }
        currentRow++;
      }

      // 空行（人数グループ間）
      currentRow++;
    }

    // OTA間に追加の空行
    currentRow++;
  }

  // カラム幅調整
  // A列: 狭め（使わない）、B列: ホテル名用、C以降: 日付
  const colA = sheet.getColumn(1);
  colA.width = 2;
  const colB = sheet.getColumn(2);
  colB.width = 22;
  for (let c = 3; c <= 3 + allDates.length; c++) {
    const col = sheet.getColumn(c);
    col.width = 7;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function otaDisplayName(ota: OtaType): string {
  const names: Record<OtaType, string> = {
    rakuten: "楽天",
    jalan: "じゃらん",
    ikyu: "一休",
    expedia: "Expedia",
    booking: "Booking.com",
    agoda: "Agoda",
    tripcom: "Trip.com",
    yahoo: "Yahooトラベル",
  };
  return names[ota];
}
