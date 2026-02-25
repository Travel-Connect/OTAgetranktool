import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { ok, err } from "@/lib/api-helpers";

/** GET /api/presets?project_id=xxx */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project_id");
  if (!projectId) return err("project_id is required");

  const db = getDb();
  const { data, error } = await db
    .from("project_default_presets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return err(error.message, 500);
  return ok(data);
}

/** POST /api/presets */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { project_id, name } = body;

  if (!project_id || !name) return err("project_id and name are required");

  const db = getDb();
  const { data, error } = await db
    .from("project_default_presets")
    .insert({
      project_id,
      name,
      otas_json: body.otas_json ?? [],
      adults_per_room_json: body.adults_per_room_json ?? [2],
      rooms_int: body.rooms_int ?? 1,
      nights_int: body.nights_int ?? 1,
      date_mode: body.date_mode ?? "rule",
      date_list_json: body.date_list_json ?? null,
      rule_json: body.rule_json ?? null,
      enabled: body.enabled ?? true,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
}

/** PUT /api/presets */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return err("id is required");

  const db = getDb();
  const { data, error } = await db
    .from("project_default_presets")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}
