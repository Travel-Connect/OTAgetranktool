import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-helpers";
import { runJob } from "@/lib/job-runner";

/** POST /api/jobs/[id]/run — ジョブ実行 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return err("job id is required");

  // バックグラウンドで実行（レスポンスは即返し）
  runJob(id).catch((e) => {
    console.error(`[runJob] ${id} failed:`, e);
  });

  return ok({ message: "Job execution started", jobId: id });
}
