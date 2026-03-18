import { NextResponse, type NextRequest } from "next/server";

/**
 * API ルート認証ミドルウェア
 * - /api/cron/* は独自の verifyCronSecret で認証するためスキップ
 * - API_SECRET 未設定時は認証スキップ（開発環境の利便性）
 * - ブラウザからは api-client.ts が X-API-Secret ヘッダーを自動付与
 */
export function middleware(request: NextRequest) {
  // /api/cron/* は独自の verifyCronSecret で認証するためスキップ
  if (request.nextUrl.pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  const secret = process.env.API_SECRET;

  // API_SECRET 未設定 → 認証スキップ（開発環境）
  if (!secret) return NextResponse.next();

  const provided = request.headers.get("x-api-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
