import { createClient } from "@supabase/supabase-js";

const SCHEMA = "ota_getrank" as const;

/**
 * ブラウザ用 Supabase クライアント (anon key)
 * Next.js の Client Component から利用
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key, {
    db: { schema: SCHEMA },
  });
}

/**
 * サーバー用 Supabase クライアント (service_role key)
 * API Routes / Cron / Worker から利用。RLS をバイパスする。
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    db: { schema: SCHEMA },
    auth: { persistSession: false },
  });
}
