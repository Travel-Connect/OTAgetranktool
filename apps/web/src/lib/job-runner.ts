import { getDb } from "./db/server";
import { OTA_BUILDERS, type SearchCondition, type SearchProfile, type OtaType } from "@ota/shared";
import { executeTask, closeBrowser, type TaskInput, type PaginationHint } from "./worker";
import { normalizeTripcomUrl } from "./worker/extractors/tripcom";
import { normalizeRakutenUrl } from "./worker/extractors/rakuten";
import { normalizeJalanUrl } from "./worker/extractors/jalan";
import { normalizeIkyuUrl } from "./worker/extractors/ikyu";
import { normalizeExpediaUrl } from "./worker/extractors/expedia";
import { normalizeAgodaUrl } from "./worker/extractors/agoda";
import { normalizeBookingUrl } from "./worker/extractors/booking";
import { normalizeYahooUrl } from "./worker/extractors/yahoo";

const MAX_RETRIES = 3;

/** 国内OTA（CAPTCHA検出が緩い → 並列実行可能） */
const DOMESTIC_OTAS = new Set<string>(["rakuten", "jalan", "ikyu", "yahoo"]);

/** 海外OTA用タスク間クールダウン (ms) */
const OTA_COOLDOWN: Record<string, number> = {
  expedia: 30000,   // 30秒 — DataDome が厳しい
  booking: 20000,   // 20秒 — IPベースボット検出
  agoda: 15000,     // 15秒 — ボット検出あり
  tripcom: 10000,   // 10秒
};
const DEFAULT_COOLDOWN = 5000;

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

  // ジョブのプロジェクトID・プリセットID取得
  const { data: job } = await db.from("jobs").select("project_id, preset_id").eq("id", jobId).single();
  if (!job) return;

  // プリセット取得（あれば area_label / hotel_ids でフィルタリング）
  let presetAreaLabel: string | null = null;
  let presetHotelIds: string[] | null = null;

  if (job.preset_id) {
    const { data: preset } = await db
      .from("project_default_presets")
      .select("area_label, hotel_ids")
      .eq("id", job.preset_id)
      .single();
    if (preset) {
      presetAreaLabel = preset.area_label || null;
      presetHotelIds = preset.hotel_ids?.length > 0 ? preset.hotel_ids : null;
    }
  }

  // 検索プロファイル取得（area_label でフィルタ）
  let profilesQuery = db
    .from("ota_search_profiles")
    .select("*")
    .eq("project_id", job.project_id)
    .eq("enabled", true);
  if (presetAreaLabel) {
    profilesQuery = profilesQuery.eq("area_label", presetAreaLabel);
  }
  const { data: profiles } = await profilesQuery;

  // ホテルOTAマッピング取得（hotel_ids でフィルタ）
  let hotelIds: string[];
  if (presetHotelIds) {
    hotelIds = presetHotelIds;
  } else {
    const { data: hotelLinks } = await db
      .from("project_hotels")
      .select("hotel_id")
      .eq("project_id", job.project_id);
    hotelIds = (hotelLinks ?? []).map((h: any) => h.hotel_id);
  }

  const { data: mappings } = await db
    .from("hotel_ota_mappings")
    .select("*")
    .in("hotel_id", hotelIds)
    .eq("enabled", true);

  // ── 前回ヒント取得（スマートページネーション用）──
  // preset_id ベースで検索し、同一エリア・同一ホテルセットのジョブからのみ取得
  const hintsByKey = new Map<string, PaginationHint>();
  if (job.preset_id) {
    const { data: prevJobs } = await db
      .from("jobs")
      .select("id")
      .eq("preset_id", job.preset_id)
      .in("status", ["success", "partial"])
      .neq("id", jobId)
      .order("run_date", { ascending: false })
      .limit(5);

    const prevJobIds = (prevJobs ?? []).map((j: any) => j.id);
    if (prevJobIds.length > 0) {
      const { data: prevResults } = await db
        .from("job_tasks")
        .select("ota, adults_per_room, task_results(pagination_hints_json, scanned_natural_count)")
        .in("job_id", prevJobIds)
        .eq("status", "success");

      for (const r of prevResults ?? []) {
        const key = `${r.ota}|${r.adults_per_room}`;
        if (hintsByKey.has(key)) continue; // 最新のもののみ
        const tr = Array.isArray(r.task_results) ? r.task_results[0] : r.task_results;
        if (tr?.pagination_hints_json) {
          hintsByKey.set(key, tr.pagination_hints_json as PaginationHint);
        }
      }
      if (hintsByKey.size > 0) {
        console.log(`[hints] Loaded ${hintsByKey.size} pagination hints from preset ${job.preset_id}`);
      }
    }
  }

  // 国内OTAと海外OTAに分離
  const domesticTasks = tasks.filter((t: any) => DOMESTIC_OTAS.has(t.ota));
  const overseasTasks = tasks.filter((t: any) => !DOMESTIC_OTAS.has(t.ota));

  let successCount = 0;
  let failCount = 0;

  /** 共通: タスク準備（URL生成 + ホテルURLマップ構築） */
  function prepareTask(task: any): { url: string; hotelUrlMap: Map<string, string[]> } | null {
    const profile = (profiles ?? []).find((p: any) => p.ota === task.ota);
    if (!profile) return null;

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

    const hotelUrlMap = new Map<string, string[]>();
    for (const m of (mappings ?? []).filter((m: any) => m.ota === task.ota)) {
      const existing = hotelUrlMap.get(m.hotel_id) ?? [];
      let normalizedUrl = m.ota_property_url;
      if (task.ota === "tripcom") {
        normalizedUrl = normalizeTripcomUrl(m.ota_property_url);
      } else if (task.ota === "rakuten") {
        normalizedUrl = normalizeRakutenUrl(m.ota_property_url);
      } else if (task.ota === "jalan") {
        normalizedUrl = normalizeJalanUrl(m.ota_property_url);
      } else if (task.ota === "ikyu") {
        normalizedUrl = normalizeIkyuUrl(m.ota_property_url);
      } else if (task.ota === "expedia") {
        normalizedUrl = normalizeExpediaUrl(m.ota_property_url);
      } else if (task.ota === "agoda") {
        normalizedUrl = normalizeAgodaUrl(m.ota_property_url);
      } else if (task.ota === "booking") {
        normalizedUrl = normalizeBookingUrl(m.ota_property_url);
      } else if (task.ota === "yahoo") {
        normalizedUrl = normalizeYahooUrl(m.ota_property_url);
      }
      existing.push(normalizedUrl);
      hotelUrlMap.set(m.hotel_id, existing);
    }

    return { url, hotelUrlMap };
  }

  /** 共通: 1タスク実行 → 結果処理 → リトライ用タスクを返す（リトライ不要なら null） */
  async function runSingleTask(task: any): Promise<any | null> {
    const prepared = prepareTask(task);
    if (!prepared) {
      await db
        .from("job_tasks")
        .update({
          status: "skipped",
          last_error_code: "no_profile",
          last_error_message: `No search profile for ${task.ota}`,
          finished_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      return null;
    }

    const { url, hotelUrlMap } = prepared;

    await db
      .from("job_tasks")
      .update({
        status: "running",
        attempt_count: (task.attempt_count ?? 0) + 1,
        started_at: new Date().toISOString(),
        executed_url: url,
      })
      .eq("id", task.id);

    // ヒント取得
    const hintKey = `${task.ota}|${task.adults_per_room}`;
    const paginationHint = hintsByKey.get(hintKey) ?? null;

    const input: TaskInput = { ota: task.ota as OtaType, url, hotelUrlMap, paginationHint };
    let result;
    try {
      result = await executeTask(input);
    } catch (error) {
      // executeTask がタイムアウト等で reject した場合
      const msg = error instanceof Error ? error.message : String(error);
      result = {
        success: false,
        totalCountInt: null,
        totalCountRawText: null,
        rankResult: null,
        executedUrl: url,
        errorCode: "execution_error",
        errorMessage: msg,
      };
    }

    if (result.success && result.rankResult) {
      await db
        .from("job_tasks")
        .update({ status: "success", finished_at: new Date().toISOString() })
        .eq("id", task.id);

      await db.from("task_results").upsert({
        task_id: task.id,
        total_count_int: result.totalCountInt,
        total_count_raw_text: result.totalCountRawText,
        ranks_json: result.rankResult.ranks,
        display_ranks_json: result.rankResult.displayRanks,
        scanned_natural_count: result.rankResult.scannedNaturalCount,
        debug_items_sample_json: result.rankResult.debugItemsSample,
        pagination_hints_json: result.paginationHints
          ? { hotelPageMap: result.paginationHints, scannedCount: result.scannedCount ?? 0 }
          : null,
      });

      successCount++;
      return null;
    } else {
      const attemptCount = (task.attempt_count ?? 0) + 1;

      if (result.screenshotBuffer || result.htmlContent) {
        await saveArtifacts(task.id, result.screenshotBuffer, result.htmlContent);
      }

      if (attemptCount < MAX_RETRIES) {
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

        return { ...task, attempt_count: attemptCount };
      } else {
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
        return null;
      }
    }
  }

  try {
    // ── Phase 1: 国内OTA 並列実行（バッチ制御） ──
    // 楽天・じゃらん・一休・Yahoo は CAPTCHA が緩いため同時実行
    // browser pool の MAX_CONCURRENCY=5 に合わせて5タスクずつバッチ処理
    const PARALLEL_BATCH_SIZE = 5;
    if (domesticTasks.length > 0) {
      console.log(`[parallel] Running ${domesticTasks.length} domestic OTA tasks (batch size: ${PARALLEL_BATCH_SIZE})`);
      let retryQueue = [...domesticTasks];

      while (retryQueue.length > 0) {
        const batch = retryQueue.splice(0, PARALLEL_BATCH_SIZE);
        const retryResults = await Promise.all(batch.map(runSingleTask));
        const retries = retryResults.filter((r): r is any => r !== null);
        retryQueue.push(...retries);
      }
    }

    // ── Phase 2: 海外OTA 逐次実行（インターリーブ + クールダウン） ──
    // Expedia・Booking・Agoda・Trip.com は CAPTCHA 対策のため1つずつ
    if (overseasTasks.length > 0) {
      const overseasQueue = interleaveByOta(overseasTasks);
      console.log(`[sequential] Running ${overseasQueue.length} overseas OTA tasks sequentially`);

      let lastExecutedOta: string | null = null;
      let lastExecutedTime = 0;

      while (overseasQueue.length > 0) {
        const task = overseasQueue.shift()!;

        // 同一OTA連続実行時のクールダウン
        if (lastExecutedOta === task.ota) {
          const cooldown = OTA_COOLDOWN[task.ota] ?? DEFAULT_COOLDOWN;
          const elapsed = Date.now() - lastExecutedTime;
          if (elapsed < cooldown) {
            const waitMs = cooldown - elapsed;
            console.log(`[cooldown] ${task.ota}: waiting ${Math.round(waitMs / 1000)}s before next task`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
          }
        }

        const retryTask = await runSingleTask(task);

        lastExecutedOta = task.ota;
        lastExecutedTime = Date.now();

        if (retryTask) {
          overseasQueue.push(retryTask);
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

/**
 * OTAインターリーブ: 同一OTAが連続しないようタスクを並べ替える
 * 例: [楽天4/4, 楽天4/5, じゃらん4/4, じゃらん4/5] → [楽天4/4, じゃらん4/4, 楽天4/5, じゃらん4/5]
 */
function interleaveByOta(tasks: any[]): any[] {
  // OTA別にグループ化（チェックイン日順は維持）
  const byOta = new Map<string, any[]>();
  for (const t of tasks) {
    const group = byOta.get(t.ota) ?? [];
    group.push(t);
    byOta.set(t.ota, group);
  }

  // ラウンドロビンで結合
  const result: any[] = [];
  const queues = [...byOta.values()];
  let round = 0;
  while (result.length < tasks.length) {
    let added = false;
    for (const q of queues) {
      if (round < q.length) {
        result.push(q[round]);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return result;
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
