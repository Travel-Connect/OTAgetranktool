import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { ok, err, verifyCronSecret } from "@/lib/api-helpers";

/** POST /api/cron/cleanup — 3ヶ月超のデータ削除 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return err("Unauthorized", 401);
  }

  const db = getDb();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  const cutoffDate = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

  // 1. 削除対象ジョブの取得
  const { data: oldJobs } = await db
    .from("jobs")
    .select("id")
    .lt("run_date", cutoffDate);

  if (!oldJobs || oldJobs.length === 0) {
    return ok({ message: "Nothing to clean up", deleted: 0 });
  }

  const jobIds = oldJobs.map((j: any) => j.id);

  // 2. 証跡のStorage削除（task_artifacts のパスを取得）
  const { data: artifacts } = await db
    .from("job_tasks")
    .select("task_artifacts(screenshot_path, html_path)")
    .in("job_id", jobIds);

  const storagePaths: string[] = [];
  for (const t of artifacts ?? []) {
    const a = (t as any).task_artifacts;
    if (a?.screenshot_path) storagePaths.push(a.screenshot_path);
    if (a?.html_path) storagePaths.push(a.html_path);
  }

  if (storagePaths.length > 0) {
    await db.storage.from("ota-getrank-artifacts").remove(storagePaths);
  }

  // 3. Excel Storage 削除
  for (const jobId of jobIds) {
    await db.storage
      .from("ota-getrank-artifacts")
      .remove([`excel/${jobId}.xlsx`])
      .catch(() => {});
  }

  // 4. DB削除（CASCADE で job_tasks → task_results / task_artifacts も削除）
  const { error } = await db.from("jobs").delete().in("id", jobIds);

  if (error) return err(error.message, 500);
  return ok({
    message: `Cleaned up ${jobIds.length} jobs before ${cutoffDate}`,
    deleted: jobIds.length,
    storageFilesRemoved: storagePaths.length,
  });
}
