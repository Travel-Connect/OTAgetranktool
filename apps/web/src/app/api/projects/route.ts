import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { ok, err } from "@/lib/api-helpers";

/** GET /api/projects — 一覧取得 */
export async function GET() {
  const db = getDb();
  const { data, error } = await db
    .from("projects")
    .select("*, project_hotels(hotel_id, sort_order)")
    .order("created_at", { ascending: false });

  if (error) return err(error.message, 500);
  return ok(data);
}

/** POST /api/projects — 新規作成 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;
  if (!name) return err("name is required");

  const db = getDb();
  const { data, error } = await db
    .from("projects")
    .insert({ name })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
}

/** PUT /api/projects — 更新 (body に id 必須) */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return err("id is required");

  const db = getDb();
  const { data, error } = await db
    .from("projects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return err(error.message, 500);
  return ok(data);
}
