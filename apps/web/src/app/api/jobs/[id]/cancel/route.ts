import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-helpers";
import { getDb } from "@/lib/db/server";

/** POST /api/jobs/[id]/cancel — ジョブ停止 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return err("job id is required");

  const db = getDb();

  // ジョブ状態を cancelled に変更（running の場合のみ）
  const { data: job, error: jobErr } = await db
    .from("jobs")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "running")
    .select("id")
    .single();

  if (jobErr || !job) {
    return err("ジョブが見つからないか、実行中ではありません", 404);
  }

  // 未実行タスク (queued) を skipped に変更
  await db
    .from("job_tasks")
    .update({ status: "skipped" })
    .eq("job_id", id)
    .eq("status", "queued");

  return ok({ message: "Job cancelled", jobId: id });
}
