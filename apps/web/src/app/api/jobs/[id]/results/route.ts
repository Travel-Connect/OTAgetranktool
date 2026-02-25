import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { ok, err } from "@/lib/api-helpers";

/** GET /api/jobs/[id]/results — ジョブ結果取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();

  // ジョブ基本情報
  const { data: job, error: jobErr } = await db
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (jobErr || !job) return err("Job not found", 404);

  // タスク + 結果 + 証跡
  const { data: tasks, error: taskErr } = await db
    .from("job_tasks")
    .select("*, task_results(*), task_artifacts(*)")
    .eq("job_id", id)
    .order("ota")
    .order("checkin_date", { ascending: true });

  if (taskErr) return err(taskErr.message, 500);

  return ok({ job, tasks });
}
