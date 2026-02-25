import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { err } from "@/lib/api-helpers";
import { buildExcel } from "@/lib/excel-builder";

/** GET /api/jobs/[id]/excel — Excel出力 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();

  // ジョブ情報
  const { data: job } = await db
    .from("jobs")
    .select("*, projects(name)")
    .eq("id", id)
    .single();

  if (!job) return err("Job not found", 404);

  // タスク + 結果
  const { data: tasks } = await db
    .from("job_tasks")
    .select("ota, checkin_date, adults_per_room, nights, rooms, task_results(*)")
    .eq("job_id", id)
    .eq("status", "success");

  // ホテル一覧
  const { data: hotelLinks } = await db
    .from("project_hotels")
    .select("hotel_id, hotels(id, display_name)")
    .eq("project_id", job.project_id)
    .order("sort_order");

  const hotels = (hotelLinks ?? []).map((h: any) => ({
    id: h.hotels.id,
    display_name: h.hotels.display_name,
  }));

  const buffer = await buildExcel({
    runDate: job.run_date,
    projectName: (job as any).projects?.name ?? "",
    nights: tasks?.[0]?.nights ?? 1,
    rooms: tasks?.[0]?.rooms ?? 1,
    hotels,
    tasks: (tasks ?? []).map((t: any) => ({
      ...t,
      task_results: Array.isArray(t.task_results) ? t.task_results[0] ?? null : t.task_results,
    })),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rank_${job.run_date}_${id.slice(0, 8)}.xlsx"`,
    },
  });
}
