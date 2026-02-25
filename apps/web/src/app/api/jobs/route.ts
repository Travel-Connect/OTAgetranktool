import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { ok, err } from "@/lib/api-helpers";

/** GET /api/jobs?project_id=xxx */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project_id");
  if (!projectId) return err("project_id is required");

  const db = getDb();
  const { data, error } = await db
    .from("jobs")
    .select("*, job_tasks(count)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return err(error.message, 500);
  return ok(data);
}

/** POST /api/jobs — ジョブ作成（タスクも同時生成） */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { project_id, preset_id, run_date, tasks } = body;

  if (!project_id || !run_date) return err("project_id and run_date are required");

  const db = getDb();

  // 1. ジョブ作成
  const { data: job, error: jobErr } = await db
    .from("jobs")
    .insert({ project_id, run_date, preset_id: preset_id ?? null })
    .select()
    .single();

  if (jobErr || !job) return err(jobErr?.message ?? "Job creation failed", 500);

  // 2. タスク作成（tasks配列が渡された場合）
  if (tasks && Array.isArray(tasks) && tasks.length > 0) {
    const taskRows = tasks.map((t: any) => ({
      job_id: job.id,
      ota: t.ota,
      checkin_date: t.checkin_date,
      nights: t.nights ?? 1,
      rooms: t.rooms ?? 1,
      adults_per_room: t.adults_per_room ?? 2,
    }));

    const { error: taskErr } = await db.from("job_tasks").insert(taskRows);
    if (taskErr) return err(taskErr.message, 500);
  }

  return ok(job, 201);
}
