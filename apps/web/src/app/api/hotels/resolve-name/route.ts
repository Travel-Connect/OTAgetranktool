import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-helpers";
import { OTA_LIST } from "@ota/shared";
import { resolveHotelName } from "@/lib/worker/resolve-hotel-name";
import { closeBrowser } from "@/lib/worker/browser-pool";
import type { OtaType } from "@ota/shared";

/**
 * POST /api/hotels/resolve-name
 * OTA施設URLからホテル名を自動取得
 *
 * Body: { ota: "rakuten", property_url: "https://travel.rakuten.co.jp/HOTEL/16443/" }
 * Response: { name: "ロワジールホテル那覇", ota: "rakuten", property_url: "..." }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ota, property_url } = body;

  if (!ota || !property_url) {
    return err("ota and property_url are required");
  }

  if (!OTA_LIST.includes(ota)) {
    return err(`Invalid ota: ${ota}. Valid: ${OTA_LIST.join(", ")}`);
  }

  try {
    const name = await resolveHotelName(ota as OtaType, property_url);

    if (!name) {
      return err("ホテル名を取得できませんでした。URLを確認してください。", 404);
    }

    return ok({ name, ota, property_url });
  } catch (e: any) {
    return err(`取得エラー: ${e.message}`, 500);
  } finally {
    await closeBrowser();
  }
}
