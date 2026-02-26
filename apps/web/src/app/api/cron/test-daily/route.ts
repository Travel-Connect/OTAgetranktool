import { NextRequest } from "next/server";

/**
 * POST /api/cron/test-daily
 * 管理UIからCron Dailyをテスト実行するためのプロキシ。
 * CRON_SECRET を内部で付与して /api/cron/daily を呼び出す。
 * 開発環境でのみ使用想定。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const res = await fetch(`${origin}/api/cron/daily`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
