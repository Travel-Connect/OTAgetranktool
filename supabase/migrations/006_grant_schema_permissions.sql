-- ============================================
-- Migration 006: Grant schema permissions
-- PostgREST の各ロールに ota_getrank スキーマへのアクセス権を付与
-- ============================================

-- USAGE 権限（スキーマにアクセスできるようにする）
GRANT USAGE ON SCHEMA ota_getrank TO anon, authenticated, service_role;

-- テーブルの SELECT/INSERT/UPDATE/DELETE 権限
GRANT ALL ON ALL TABLES IN SCHEMA ota_getrank TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA ota_getrank TO anon, authenticated;

-- 今後作成されるテーブルにもデフォルト権限を設定
ALTER DEFAULT PRIVILEGES IN SCHEMA ota_getrank
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA ota_getrank
  GRANT SELECT ON TABLES TO anon, authenticated;
