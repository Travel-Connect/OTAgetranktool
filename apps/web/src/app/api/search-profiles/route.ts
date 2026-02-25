import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { ok, err } from "@/lib/api-helpers";

/** GET /api/search-profiles?project_id=xxx */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project_id");
  if (!projectId) return err("project_id is required");

  const db = getDb();
  const { data, error } = await db
    .from("ota_search_profiles")
    .select("*")
    .eq("project_id", projectId)
    .order("ota");

  if (error) return err(error.message, 500);
  return ok(data);
}

/** POST /api/search-profiles */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { project_id, ota, base_url } = body;

  if (!project_id || !ota || !base_url) {
    return err("project_id, ota, base_url are required");
  }

  const db = getDb();
  const { data, error } = await db
    .from("ota_search_profiles")
    .insert({
      project_id,
      ota,
      base_url,
      variable_mapping_json: body.variable_mapping_json ?? {},
      allowlist_params_json: body.allowlist_params_json ?? null,
      denylist_params_json: body.denylist_params_json ?? null,
      enabled: body.enabled ?? true,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
}

/** PUT /api/search-profiles */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return err("id is required");

  const db = getDb();
  const { data, error } = await db
    .from("ota_search_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}
