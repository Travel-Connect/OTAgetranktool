import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/server";
import { ok, err } from "@/lib/api-helpers";

/** GET /api/hotels?project_id=xxx — プロジェクト配下のホテル一覧 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project_id");
  const db = getDb();

  if (projectId) {
    // プロジェクト指定: inner join でフィルター＋並び替え
    const { data, error } = await db
      .from("hotels")
      .select("*, hotel_ota_mappings(*), project_hotels!inner(project_id, sort_order)")
      .eq("project_hotels.project_id", projectId)
      .order("sort_order", { referencedTable: "project_hotels" } as any);
    if (error) return err(error.message, 500);
    return ok(data);
  }

  // プロジェクト未指定: 全ホテル一覧
  const { data, error } = await db
    .from("hotels")
    .select("*, hotel_ota_mappings(*)")
    .order("created_at", { ascending: false });
  if (error) return err(error.message, 500);
  return ok(data);
}

/** POST /api/hotels — ホテル作成 + プロジェクト紐付け + OTAマッピング */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { display_name, memo, project_id, sort_order, ota_mappings } = body;

  if (!display_name) return err("display_name is required");
  if (!project_id) return err("project_id is required");

  const db = getDb();

  // 1. ホテル作成
  const { data: hotel, error: hotelErr } = await db
    .from("hotels")
    .insert({ display_name, memo })
    .select()
    .single();

  if (hotelErr || !hotel) return err(hotelErr?.message ?? "Hotel creation failed", 500);

  // 2. プロジェクト紐付け
  const { error: linkErr } = await db
    .from("project_hotels")
    .insert({ project_id, hotel_id: hotel.id, sort_order: sort_order ?? 0 });

  if (linkErr) return err(linkErr.message, 500);

  // 3. OTAマッピング（あれば）
  if (ota_mappings && Array.isArray(ota_mappings)) {
    const mappings = ota_mappings.map((m: any) => ({
      hotel_id: hotel.id,
      ota: m.ota,
      ota_property_url: m.ota_property_url,
      ota_property_id: m.ota_property_id ?? null,
      enabled: m.enabled ?? true,
    }));
    const { error: mapErr } = await db.from("hotel_ota_mappings").insert(mappings);
    if (mapErr) {
      // ロールバック
      await db.from("project_hotels").delete().eq("hotel_id", hotel.id);
      await db.from("hotels").delete().eq("id", hotel.id);
      return err(mapErr.message, 500);
    }
  }

  return ok(hotel, 201);
}

/** PUT /api/hotels — ホテル更新 + OTAマッピング同期 */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ota_mappings, ...updates } = body;
  if (!id) return err("id is required");

  const db = getDb();

  // 1. ホテル基本情報の更新
  const hotelUpdates: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  // ota_mappings以外のフィールドがあれば更新
  const { data, error } = await db
    .from("hotels")
    .update(hotelUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) return err(error.message, 500);

  // 2. OTAマッピングの同期（指定があれば）
  if (ota_mappings && Array.isArray(ota_mappings)) {
    // 既存マッピングを全削除して再作成（シンプルな同期）
    const { error: delErr } = await db
      .from("hotel_ota_mappings")
      .delete()
      .eq("hotel_id", id);
    if (delErr) return err(delErr.message, 500);

    if (ota_mappings.length > 0) {
      const mappings = ota_mappings.map((m: any) => ({
        hotel_id: id,
        ota: m.ota,
        ota_property_url: m.ota_property_url,
        ota_property_id: m.ota_property_id ?? null,
        enabled: m.enabled ?? true,
      }));
      const { error: insErr } = await db
        .from("hotel_ota_mappings")
        .insert(mappings);
      if (insErr) return err(insErr.message, 500);
    }
  }

  return ok(data);

}

/** DELETE /api/hotels — ホテル削除 */
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) return err("id is required");

  const db = getDb();
  await db.from("hotel_ota_mappings").delete().eq("hotel_id", id);
  await db.from("project_hotels").delete().eq("hotel_id", id);
  const { error } = await db.from("hotels").delete().eq("id", id);
  if (error) return err(error.message, 500);
  return ok({ deleted: id });
}
