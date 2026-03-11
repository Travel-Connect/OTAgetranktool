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

  // 2. タスク作成
  let taskRows: Array<Record<string, unknown>> = [];

  if (tasks && Array.isArray(tasks) && tasks.length > 0) {
    // 明示的にタスク配列が渡された場合
    taskRows = tasks.map((t: any) => ({
      job_id: job.id,
      ota: t.ota,
      checkin_date: t.checkin_date,
      nights: t.nights ?? 1,
      rooms: t.rooms ?? 1,
      adults_per_room: t.adults_per_room ?? 2,
    }));
  } else if (preset_id) {
    // プリセットからタスク自動生成
    const { data: preset, error: presetErr } = await db
      .from("project_default_presets")
      .select("*")
      .eq("id", preset_id)
      .single();

    if (presetErr || !preset) return err("Preset not found", 404);

    const otas: string[] = preset.otas_json ?? [];
    const nights: number = preset.nights_int ?? 1;
    const rooms: number = preset.rooms_int ?? 1;
    const adultsPerRoomList: number[] =
      preset.adults_per_room_json?.length > 0 ? preset.adults_per_room_json : [2];

    // チェックイン日を生成
    let checkinDates: string[] = [];

    if (preset.date_mode === "list" && preset.date_list_json?.length > 0) {
      checkinDates = preset.date_list_json;
    } else if (preset.rule_json?.offsets?.length > 0) {
      const baseDate = new Date(run_date);
      checkinDates = preset.rule_json.offsets.map((offset: number) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + offset);
        return d.toISOString().slice(0, 10);
      });
    }

    if (otas.length === 0 || checkinDates.length === 0) {
      return err("Preset has no OTAs or no dates configured", 400);
    }

    // OTA × チェックイン日 × 人数 の全組み合わせ
    for (const ota of otas) {
      for (const checkinDate of checkinDates) {
        for (const adultsPerRoom of adultsPerRoomList) {
          taskRows.push({
            job_id: job.id,
            ota,
            checkin_date: checkinDate,
            nights,
            rooms,
            adults_per_room: adultsPerRoom,
          });
        }
      }
    }
  }

  if (taskRows.length > 0) {
    const { error: taskErr } = await db.from("job_tasks").insert(taskRows);
    if (taskErr) return err(taskErr.message, 500);
  }

  return ok(job, 201);
}
