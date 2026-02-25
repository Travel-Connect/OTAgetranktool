-- ============================================
-- Migration 002: Master tables
-- ============================================

-- プロジェクト
CREATE TABLE ota_getrank.projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  timezone    text NOT NULL DEFAULT 'Asia/Tokyo',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ホテル
CREATE TABLE ota_getrank.hotels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  text NOT NULL,
  memo          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- プロジェクト × ホテル 中間テーブル
CREATE TABLE ota_getrank.project_hotels (
  project_id  uuid NOT NULL REFERENCES ota_getrank.projects(id) ON DELETE CASCADE,
  hotel_id    uuid NOT NULL REFERENCES ota_getrank.hotels(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, hotel_id)
);

CREATE INDEX idx_project_hotels_project ON ota_getrank.project_hotels(project_id);
