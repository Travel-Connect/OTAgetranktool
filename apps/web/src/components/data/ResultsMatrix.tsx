"use client";

import type { JobTask, Hotel } from "@/lib/types";
import { OTA_DISPLAY_NAMES } from "@/lib/constants";
import type { OtaType } from "@ota/shared";

interface Props {
  tasks: JobTask[];
  hotels: Hotel[];
}

function rankCellClass(rank: number | null | undefined): string {
  if (rank === null || rank === undefined) return "text-red-500 bg-red-50";
  if (rank <= 3) return "text-green-700 bg-green-50 font-bold";
  if (rank <= 10) return "text-yellow-700 bg-yellow-50 font-semibold";
  return "text-gray-700";
}

export function ResultsMatrix({ tasks, hotels }: Props) {
  // OTAごとにグループ化
  const otaGroups = new Map<string, JobTask[]>();
  for (const t of tasks) {
    if (t.status !== "success" || !t.task_results) continue;
    const list = otaGroups.get(t.ota) ?? [];
    list.push(t);
    otaGroups.set(t.ota, list);
  }

  if (otaGroups.size === 0) {
    return <p className="text-gray-400 text-sm py-4">成功したタスクがありません</p>;
  }

  return (
    <div className="space-y-6">
      {[...otaGroups.entries()].map(([ota, otaTasks]) => {
        // 人数でさらにグループ化
        const adultGroups = new Map<number, JobTask[]>();
        for (const t of otaTasks) {
          const list = adultGroups.get(t.adults_per_room) ?? [];
          list.push(t);
          adultGroups.set(t.adults_per_room, list);
        }

        return (
          <div key={ota}>
            <h3 className="text-base font-bold text-gray-800 mb-2">
              {OTA_DISPLAY_NAMES[ota as OtaType] ?? ota}
            </h3>

            {[...adultGroups.entries()].sort(([a], [b]) => a - b).map(([adults, sectionTasks]) => {
              const dates = [...new Set(sectionTasks.map((t) => t.checkin_date))].sort();

              return (
                <div key={`${ota}-${adults}`} className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-1">{adults}名/室</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border border-gray-200">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-left font-semibold border-r border-gray-200 sticky left-0 bg-gray-100 min-w-[140px]">
                            ホテル
                          </th>
                          {dates.map((d) => (
                            <th key={d} className="px-3 py-2 text-center font-semibold border-r border-gray-200 whitespace-nowrap">
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hotels.map((hotel) => (
                          <tr key={hotel.id} className="border-t border-gray-100">
                            <td className="px-3 py-1.5 font-medium border-r border-gray-200 sticky left-0 bg-white">
                              {hotel.display_name}
                            </td>
                            {dates.map((date) => {
                              const task = sectionTasks.find((t) => t.checkin_date === date);
                              const rank = task?.task_results?.ranks_json?.[hotel.id];
                              return (
                                <td
                                  key={date}
                                  className={`px-3 py-1.5 text-center border-r border-gray-200 ${rankCellClass(rank)}`}
                                >
                                  {rank === null || rank === undefined ? "圏外" : rank}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {/* 総件数行 */}
                        <tr className="border-t-2 border-gray-300 bg-gray-50">
                          <td className="px-3 py-1.5 font-semibold border-r border-gray-200 sticky left-0 bg-gray-50">
                            総件数
                          </td>
                          {dates.map((date) => {
                            const task = sectionTasks.find((t) => t.checkin_date === date);
                            const count = task?.task_results?.total_count_int;
                            return (
                              <td key={date} className="px-3 py-1.5 text-center border-r border-gray-200 text-gray-600">
                                {count != null ? `${count}件` : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
