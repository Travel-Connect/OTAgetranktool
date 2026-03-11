import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-helpers";
import { OTA_LIST } from "@ota/shared";
import { resolveHotelName } from "@/lib/worker/resolve-hotel-name";
import type { OtaType } from "@ota/shared";

/** OTA別に許可するドメイン (SSRF防止) */
const ALLOWED_DOMAINS: Record<string, string[]> = {
  rakuten: ["travel.rakuten.co.jp", "search.travel.rakuten.co.jp"],
  jalan: ["www.jalan.net"],
  ikyu: ["www.ikyu.com"],
  booking: ["www.booking.com"],
  expedia: ["www.expedia.co.jp", "www.expedia.com"],
  agoda: ["www.agoda.com"],
  tripcom: ["jp.trip.com", "www.trip.com"],
  yahoo: ["travel.yahoo.co.jp"],
};

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

  // SSRF防止: URLスキーム + ドメイン検証
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(property_url);
  } catch {
    return err("Invalid URL format");
  }

  if (parsedUrl.protocol !== "https:") {
    return err("Only https URLs are allowed");
  }

  const allowedDomains = ALLOWED_DOMAINS[ota] ?? [];
  if (!allowedDomains.includes(parsedUrl.hostname)) {
    return err(`Invalid domain for ${ota}. Allowed: ${allowedDomains.join(", ")}`);
  }

  try {
    const name = await resolveHotelName(ota as OtaType, property_url);

    if (!name) {
      return err("ホテル名を取得できませんでした。URLを確認してください。", 404);
    }

    return ok({ name, ota, property_url });
  } catch (e: any) {
    return err(`取得エラー: ${e.message}`, 500);
  }
}
