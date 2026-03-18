import { createClient } from "@supabase/supabase-js";

const SCHEMA = "ota_getrank" as const;

/** サーバー用 Supabase クライアント (service_role, RLS bypass) — シングルトン */
let _db: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _db = createClient(url, key, {
      db: { schema: SCHEMA },
      auth: { persistSession: false },
    });
  }
  return _db;
}
