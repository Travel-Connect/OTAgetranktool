-- ============================================
-- Migration 005: RLS policies
-- ============================================
-- 基本方針: service_role でのAPI操作が主。
-- anon/authenticated からは読み取りのみ許可。

-- RLS有効化
ALTER TABLE ota_getrank.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_getrank.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_getrank.project_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_getrank.hotel_ota_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_getrank.ota_search_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_getrank.project_default_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_getrank.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_getrank.job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_getrank.task_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_getrank.task_artifacts ENABLE ROW LEVEL SECURITY;

-- service_role は全操作可能（Supabaseデフォルトでbypass RLS）
-- authenticated ユーザーは読み取りのみ
CREATE POLICY "authenticated_read_projects" ON ota_getrank.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_hotels" ON ota_getrank.hotels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_project_hotels" ON ota_getrank.project_hotels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_hotel_ota_mappings" ON ota_getrank.hotel_ota_mappings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_ota_search_profiles" ON ota_getrank.ota_search_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_presets" ON ota_getrank.project_default_presets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_jobs" ON ota_getrank.jobs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_job_tasks" ON ota_getrank.job_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_task_results" ON ota_getrank.task_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_task_artifacts" ON ota_getrank.task_artifacts
  FOR SELECT TO authenticated USING (true);
