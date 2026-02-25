-- ============================================
-- Migration 001: Schema + Enums
-- Schema: ota_getrank (isolated from other projects)
-- ============================================

CREATE SCHEMA IF NOT EXISTS ota_getrank;

-- OTA種別
CREATE TYPE ota_getrank.ota_type AS ENUM (
  'rakuten',
  'jalan',
  'ikyu',
  'expedia',
  'booking',
  'agoda',
  'tripcom'
);

-- ジョブステータス
CREATE TYPE ota_getrank.job_status AS ENUM (
  'queued',
  'running',
  'success',
  'partial',
  'failed'
);

-- タスクステータス
CREATE TYPE ota_getrank.task_status AS ENUM (
  'queued',
  'running',
  'success',
  'failed',
  'skipped'
);

-- 日付モード（プリセット用）
CREATE TYPE ota_getrank.date_mode AS ENUM (
  'list',
  'rule'
);
