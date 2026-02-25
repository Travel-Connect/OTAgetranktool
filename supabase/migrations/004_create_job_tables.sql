-- ============================================
-- Migration 004: Job / Task / Result / Artifact tables
-- ============================================

-- ジョブ（集計日×プロジェクト単位）
CREATE TABLE ota_getrank.jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES ota_getrank.projects(id) ON DELETE CASCADE,
  run_date      date NOT NULL,
  preset_id     uuid REFERENCES ota_getrank.project_default_presets(id) ON DELETE SET NULL,
  status        ota_getrank.job_status NOT NULL DEFAULT 'queued',
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_project_date ON ota_getrank.jobs(project_id, run_date);
CREATE INDEX idx_jobs_status ON ota_getrank.jobs(status);

-- ジョブタスク（OTA × checkin_date × adults × rooms × nights）
CREATE TABLE ota_getrank.job_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              uuid NOT NULL REFERENCES ota_getrank.jobs(id) ON DELETE CASCADE,
  ota                 ota_getrank.ota_type NOT NULL,
  checkin_date        date NOT NULL,
  nights              integer NOT NULL DEFAULT 1,
  rooms               integer NOT NULL DEFAULT 1,
  adults_per_room     integer NOT NULL DEFAULT 2,
  attempt_count       integer NOT NULL DEFAULT 0,
  status              ota_getrank.task_status NOT NULL DEFAULT 'queued',
  last_error_code     text,
  last_error_message  text,
  executed_url        text,
  started_at          timestamptz,
  finished_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_tasks_job ON ota_getrank.job_tasks(job_id);
CREATE INDEX idx_job_tasks_status ON ota_getrank.job_tasks(status);

-- タスク結果（順位・総件数）
CREATE TABLE ota_getrank.task_results (
  task_id                 uuid PRIMARY KEY REFERENCES ota_getrank.job_tasks(id) ON DELETE CASCADE,
  total_count_int         integer,
  total_count_raw_text    text,
  ranks_json              jsonb NOT NULL DEFAULT '{}',
  scanned_natural_count   integer NOT NULL DEFAULT 0,
  debug_items_sample_json jsonb,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- タスク証跡（失敗時スクショ/HTML）
CREATE TABLE ota_getrank.task_artifacts (
  task_id           uuid PRIMARY KEY REFERENCES ota_getrank.job_tasks(id) ON DELETE CASCADE,
  screenshot_path   text,
  html_path         text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
