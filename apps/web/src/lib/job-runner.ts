import { getDb } from "./db/server";
import { OTA_BUILDERS, type SearchCondition, type SearchProfile, type OtaType } from "@ota/shared";
import { executeTask, closeBrowser, type TaskInput } from "./worker";

const MAX_RETRIES = 3;

/**
 * ジョブを実行する
 * - タスクをチェックイン日昇順で巡回
 * - 失敗は末尾回し（最大3回）
 * - 全タスク完了後にジョブステータスを更新
 */
export async function runJob(jobId: string): Promise<void> {
  const db = getDb();

  // ジョブを running に
  await db.from("jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", jobId);

  // タスク一覧取得
  const { data: tasks } = await db
    .from("job_tasks")
    .select("*")
    .eq("job_id", jobId)
    .eq("status", "queued")
    .order("checkin_date", { ascending: true });

  if (!tasks || tasks.length === 0) {
    await db.from("jobs").update({ status: "success", finished_at: new Date().toISOString() }).eq("id", jobId);
    return;
  }

  // ジョブのプロジェクトID取得
  const { data: job } = await db.from("jobs").select("project_id").eq("id", jobId).single();
  if (!job) return;

  // 検索プロファイル取得
  const { data: profiles } = await db
    .from("ota_search_profiles")
    .select("*")
    .eq("project_id", job.project_id)
    .eq("enabled", true);

  // ホテルOTAマッピング取得
  const { data: hotelLinks } = await db
    .from("project_hotels")
    .select("hotel_id")
    .eq("project_id", job.project_id);

  const hotelIds = (hotelLinks ?? []).map((h: any) => h.hotel_id);
  const { data: mappings } = await db
    .from("hotel_ota_mappings")
    .select("*")
    .in("hotel_id", hotelIds)
    .eq("enabled", true);

  // タスクキュー（末尾回しリトライ）
  const taskQueue = [...tasks];
  let successCount = 0;
  let failCount = 0;

  try {
    while (taskQueue.length > 0) {
      const task = taskQueue.shift()!;

      // プロファイル検索
      const profile = (profiles ?? []).find(
        (p: any) => p.ota === task.ota,
      );
      if (!profile) {
        await db
          .from("job_tasks")
          .update({
            status: "skipped",
            last_error_code: "no_profile",
            last_error_message: `No search profile for ${task.ota}`,
            finished_at: new Date().toISOString(),
          })
          .eq("id", task.id);
        continue;
      }

      // URL生成
      const condition: SearchCondition = {
        checkinDate: task.checkin_date,
        nights: task.nights,
        rooms: task.rooms,
        adultsPerRoom: task.adults_per_room,
      };

      const searchProfile: SearchProfile = {
        ota: profile.ota as OtaType,
        baseUrl: profile.base_url,
        variableMappingJson: profile.variable_mapping_json ?? {},
        allowlistParamsJson: profile.allowlist_params_json,
        denylistParamsJson: profile.denylist_params_json,
      };

      const url = OTA_BUILDERS[task.ota as OtaType].buildUrl(condition, searchProfile);

      // ホテルURLマップ構築
      const hotelUrlMap = new Map<string, string[]>();
      for (const m of (mappings ?? []).filter((m: any) => m.ota === task.ota)) {
        const existing = hotelUrlMap.get(m.hotel_id) ?? [];
        existing.push(m.ota_property_url);
        hotelUrlMap.set(m.hotel_id, existing);
      }

      // タスク実行開始
      await db
        .from("job_tasks")
        .update({
          status: "running",
          attempt_count: (task.attempt_count ?? 0) + 1,
          started_at: new Date().toISOString(),
          executed_url: url,
        })
        .eq("id", task.id);

      const input: TaskInput = { ota: task.ota as OtaType, url, hotelUrlMap };
      const result = await executeTask(input);

      if (result.success && result.rankResult) {
        // 成功
        await db
          .from("job_tasks")
          .update({ status: "success", finished_at: new Date().toISOString() })
          .eq("id", task.id);

        await db.from("task_results").upsert({
          task_id: task.id,
          total_count_int: result.totalCountInt,
          total_count_raw_text: result.totalCountRawText,
          ranks_json: result.rankResult.ranks,
          scanned_natural_count: result.rankResult.scannedNaturalCount,
          debug_items_sample_json: result.rankResult.debugItemsSample,
        });

        successCount++;
      } else {
        // 失敗
        const attemptCount = (task.attempt_count ?? 0) + 1;

        if (attemptCount < MAX_RETRIES) {
          // 末尾回し
          await db
            .from("job_tasks")
            .update({
              status: "queued",
              attempt_count: attemptCount,
              last_error_code: result.errorCode,
              last_error_message: result.errorMessage,
              finished_at: new Date().toISOString(),
            })
            .eq("id", task.id);

          taskQueue.push({ ...task, attempt_count: attemptCount });
        } else {
          // 最終失敗
          await db
            .from("job_tasks")
            .update({
              status: "failed",
              attempt_count: attemptCount,
              last_error_code: result.errorCode,
              last_error_message: result.errorMessage,
              finished_at: new Date().toISOString(),
            })
            .eq("id", task.id);

          failCount++;
        }

        // 証跡保存
        if (result.screenshotBuffer || result.htmlContent) {
          await saveArtifacts(task.id, result.screenshotBuffer, result.htmlContent);
        }
      }
    }
  } finally {
    await closeBrowser();
  }

  // ジョブステータス更新
  const finalStatus = failCount === 0 ? "success" : successCount > 0 ? "partial" : "failed";
  await db
    .from("jobs")
    .update({ status: finalStatus, finished_at: new Date().toISOString() })
    .eq("id", jobId);
}

/** 証跡をSupabase Storageに保存 */
async function saveArtifacts(
  taskId: string,
  screenshot?: Buffer,
  html?: string,
): Promise<void> {
  const db = getDb();
  let screenshotPath: string | null = null;
  let htmlPath: string | null = null;

  if (screenshot) {
    const path = `artifacts/${taskId}/screenshot.png`;
    await db.storage.from("ota-getrank-artifacts").upload(path, screenshot, {
      contentType: "image/png",
      upsert: true,
    });
    screenshotPath = path;
  }

  if (html) {
    const path = `artifacts/${taskId}/page.html`;
    await db.storage.from("ota-getrank-artifacts").upload(path, html, {
      contentType: "text/html",
      upsert: true,
    });
    htmlPath = path;
  }

  await db.from("task_artifacts").upsert({
    task_id: taskId,
    screenshot_path: screenshotPath,
    html_path: htmlPath,
  });
}
