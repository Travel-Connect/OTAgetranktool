import { NextRequest } from "next/server";

/**
 * POST /api/cron/test-cleanup
 * 管理UIからCron Cleanupをテスト実行するためのプロキシ。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const res = await fetch(`${origin}/api/cron/cleanup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
