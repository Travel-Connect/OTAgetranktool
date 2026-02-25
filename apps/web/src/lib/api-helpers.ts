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
