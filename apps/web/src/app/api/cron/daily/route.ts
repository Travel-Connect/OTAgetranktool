import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { ok, err, verifyCronSecret } from "@/lib/api-helpers";
import { generateDates, type DateRule, WEEKDAYS_MON_FRI, formatDate, type OtaType } from "@ota/shared";
import { runJob } from "@/lib/job-runner";

/** POST /api/cron/daily — 毎日の自動実行 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return err("Unauthorized", 401);
  }

  const db = getDb();
  const today = formatDate(new Date());

  // アクティブなプロジェクト一覧
  const { data: projects } = await db
    .from("projects")
    .select("id, name")
    .eq("active", true);

  if (!projects || projects.length === 0) {
    return ok({ message: "No active projects", jobs: [] });
  }

  const createdJobs: string[] = [];

  for (const project of projects) {
    // 有効なプリセット取得
    const { data: presets } = await db
      .from("project_default_presets")
      .select("*")
      .eq("project_id", project.id)
      .eq("enabled", true);

    if (!presets || presets.length === 0) continue;

    for (const preset of presets) {
      // 日付リスト生成
      let dates: string[];
      if (preset.date_mode === "list" && preset.date_list_json) {
        dates = preset.date_list_json as string[];
      } else if (preset.rule_json) {
        const rule: DateRule = {
          offsetMonths: preset.rule_json.offset_months ?? 2,
          weekdays: preset.rule_json.weekdays ?? WEEKDAYS_MON_FRI,
          excludeJpHolidays: preset.rule_json.exclude_jp_holidays ?? true,
          generateCount: preset.rule_json.generate_count ?? 20,
        };
        dates = generateDates(today, rule);
      } else {
        continue;
      }

      const otas = (preset.otas_json ?? []) as OtaType[];
      const adultsArr = (preset.adults_per_room_json ?? [2]) as number[];

      // タスク生成
      const tasks: Array<{
        ota: string;
        checkin_date: string;
        nights: number;
        rooms: number;
        adults_per_room: number;
      }> = [];

      for (const ota of otas) {
        for (const checkinDate of dates) {
          for (const adults of adultsArr) {
            tasks.push({
              ota,
              checkin_date: checkinDate,
              nights: preset.nights_int ?? 1,
              rooms: preset.rooms_int ?? 1,
              adults_per_room: adults,
            });
          }
        }
      }

      if (tasks.length === 0) continue;

      // ジョブ作成
      const { data: job } = await db
        .from("jobs")
        .insert({
          project_id: project.id,
          run_date: today,
          preset_id: preset.id,
        })
        .select()
        .single();

      if (!job) continue;

      // タスク一括作成
      const taskRows = tasks.map((t) => ({ job_id: job.id, ...t }));
      await db.from("job_tasks").insert(taskRows);

      // バックグラウンドで実行
      runJob(job.id).catch((e) => console.error(`[cron/daily] job ${job.id}:`, e));
      createdJobs.push(job.id);
    }
  }

  return ok({ message: `Created ${createdJobs.length} jobs`, jobs: createdJobs });
}
