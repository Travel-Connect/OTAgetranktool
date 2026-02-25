import { createClient } from "@supabase/supabase-js";

const SCHEMA = "ota_getrank" as const;

/** サーバー用 Supabase クライアント (service_role, RLS bypass) */
export function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    db: { schema: SCHEMA },
    auth: { persistSession: false },
  });
}
