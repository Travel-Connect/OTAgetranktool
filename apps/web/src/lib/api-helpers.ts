import { NextResponse } from "next/server";

/** 成功レスポンス */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** エラーレスポンス */
export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Cron 認証チェック */
export function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

/** API 認証チェック（middleware のバックアップ用） */
export function verifyApiSecret(request: Request): boolean {
  const secret = process.env.API_SECRET;
  if (!secret) return true; // 未設定時はスキップ
  return request.headers.get("x-api-secret") === secret;
}
