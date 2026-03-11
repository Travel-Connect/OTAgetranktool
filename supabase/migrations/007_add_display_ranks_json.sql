-- 007: task_results に表示順位（広告含む）カラムを追加
-- ranks_json は自然順位（広告除外）、display_ranks_json は画面表示順位（広告含む）

ALTER TABLE ota_getrank.task_results
ADD COLUMN IF NOT EXISTS display_ranks_json jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN ota_getrank.task_results.display_ranks_json IS '表示順位（広告含む画面表示順）: hotel_id → rank';
