-- ============================================
-- Migration 003: OTA mapping + search profiles + presets
-- ============================================

-- ホテル × OTA マッピング（施設URL/IDで同定）
CREATE TABLE ota_getrank.hotel_ota_mappings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          uuid NOT NULL REFERENCES ota_getrank.hotels(id) ON DELETE CASCADE,
  ota               ota_getrank.ota_type NOT NULL,
  ota_property_url  text NOT NULL,
  ota_property_id   text,
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ota, ota_property_url)
);

CREATE INDEX idx_hotel_ota_mappings_hotel ON ota_getrank.hotel_ota_mappings(hotel_id);

-- OTA検索プロファイル（エリア別base_url + パラメータ制御）
CREATE TABLE ota_getrank.ota_search_profiles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES ota_getrank.projects(id) ON DELETE CASCADE,
  ota                     ota_getrank.ota_type NOT NULL,
  base_url                text NOT NULL,
  variable_mapping_json   jsonb NOT NULL DEFAULT '{}',
  allowlist_params_json   jsonb,
  denylist_params_json    jsonb,
  enabled                 boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ota_search_profiles_project ON ota_getrank.ota_search_profiles(project_id);

-- プリセット（毎日実行のデフォルト条件セット）
CREATE TABLE ota_getrank.project_default_presets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES ota_getrank.projects(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  otas_json             jsonb NOT NULL DEFAULT '[]',
  adults_per_room_json  jsonb NOT NULL DEFAULT '[2]',
  rooms_int             integer NOT NULL DEFAULT 1,
  nights_int            integer NOT NULL DEFAULT 1,
  date_mode             ota_getrank.date_mode NOT NULL DEFAULT 'rule',
  date_list_json        jsonb,
  rule_json             jsonb,
  enabled               boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_presets_project ON ota_getrank.project_default_presets(project_id);
