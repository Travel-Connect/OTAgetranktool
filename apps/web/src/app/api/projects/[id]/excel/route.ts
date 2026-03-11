import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { err } from "@/lib/api-helpers";
import { buildExcel } from "@/lib/excel-builder";

/**
 * GET /api/projects/[id]/excel?run_date=YYYY-MM-DD
 * プロジェクト単位で複数ジョブの結果を統合してExcel出力
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const runDate = request.nextUrl.searchParams.get("run_date");
  const db = getDb();

  // プロジェクト情報
  const { data: project } = await db
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();
  if (!project) return err("Project not found", 404);

  // 対象ジョブ取得（run_date指定時はその日のみ、なければ最新run_date）
  let jobsQuery = db
    .from("jobs")
    .select("id, run_date, preset_id, status")
    .eq("project_id", projectId)
    .in("status", ["success", "partial"]);

  if (runDate) {
    jobsQuery = jobsQuery.eq("run_date", runDate);
  } else {
    jobsQuery = jobsQuery.order("run_date", { ascending: false }).limit(20);
  }

  const { data: jobs } = await jobsQuery;
  if (!jobs || jobs.length === 0) return err("No completed jobs found", 404);

  // run_date未指定の場合、最新のrun_dateでフィルタ
  const targetRunDate = runDate || jobs[0].run_date;
  const targetJobs = jobs.filter((j) => j.run_date === targetRunDate);
  const jobIds = targetJobs.map((j) => j.id);

  // エリアラベル取得（各ジョブのプリセットから）
  const areaLabels: string[] = [];
  for (const job of targetJobs) {
    if (!job.preset_id) continue;
    const { data: preset } = await db
      .from("project_default_presets")
      .select("area_label")
      .eq("id", job.preset_id)
      .single();
    if (preset?.area_label && !areaLabels.includes(preset.area_label)) {
      areaLabels.push(preset.area_label);
    }
  }

  // 全ジョブのタスク + 結果を取得
  const { data: tasks } = await db
    .from("job_tasks")
    .select("ota, checkin_date, adults_per_room, nights, rooms, task_results(*)")
    .in("job_id", jobIds)
    .eq("status", "success");

  // ホテル一覧
  const { data: hotelLinks } = await db
    .from("project_hotels")
    .select("hotel_id, hotels(id, display_name)")
    .eq("project_id", projectId)
    .order("sort_order");

  const hotels = (hotelLinks ?? []).map((h: any) => ({
    id: h.hotels.id,
    display_name: h.hotels.display_name,
  }));

  // 同一 ota/checkin_date/adults_per_room のタスクをマージ
  const mergedMap = new Map<string, {
    ota: string;
    checkin_date: string;
    adults_per_room: number;
    nights: number;
    rooms: number;
    task_results: {
      total_count_int: number | null;
      ranks_json: Record<string, number | null>;
      display_ranks_json: Record<string, number | null>;
    };
  }>();

  for (const t of tasks ?? []) {
    const result = Array.isArray(t.task_results)
      ? t.task_results[0] ?? null
      : t.task_results;
    if (!result) continue;

    const key = `${t.ota}|${t.checkin_date}|${t.adults_per_room}`;
    const existing = mergedMap.get(key);

    if (!existing) {
      mergedMap.set(key, {
        ota: t.ota,
        checkin_date: t.checkin_date,
        adults_per_room: t.adults_per_room,
        nights: t.nights,
        rooms: t.rooms,
        task_results: {
          total_count_int: result.total_count_int,
          ranks_json: { ...result.ranks_json },
          display_ranks_json: { ...(result.display_ranks_json ?? result.ranks_json) },
        },
      });
    } else {
      // ランクをマージ（既存にないホテルのみ追加）
      for (const [hotelId, rank] of Object.entries(result.ranks_json ?? {}) as [string, number | null][]) {
        if (existing.task_results.ranks_json[hotelId] == null && rank != null) {
          existing.task_results.ranks_json[hotelId] = rank;
        }
      }
      const displayRanks = result.display_ranks_json ?? result.ranks_json;
      for (const [hotelId, rank] of Object.entries(displayRanks ?? {}) as [string, number | null][]) {
        if (existing.task_results.display_ranks_json[hotelId] == null && rank != null) {
          existing.task_results.display_ranks_json[hotelId] = rank;
        }
      }
      // total_count: 最大値を使用
      if (result.total_count_int != null) {
        existing.task_results.total_count_int = Math.max(
          existing.task_results.total_count_int ?? 0,
          result.total_count_int,
        );
      }
    }
  }

  const mergedTasks = [...mergedMap.values()];

  const buffer = await buildExcel({
    runDate: targetRunDate,
    projectName: project.name,
    areaLabel: areaLabels.join("・"),
    nights: mergedTasks[0]?.nights ?? 1,
    rooms: mergedTasks[0]?.rooms ?? 1,
    hotels,
    tasks: mergedTasks,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rank_${targetRunDate}_${projectId.slice(0, 8)}.xlsx"`,
    },
  });
}
