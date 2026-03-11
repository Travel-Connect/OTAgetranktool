-- 010: Smart pagination hints for optimization
-- Stores per-hotel page numbers and scanned item counts from previous runs

ALTER TABLE ota_getrank.task_results
ADD COLUMN IF NOT EXISTS pagination_hints_json jsonb DEFAULT NULL;

COMMENT ON COLUMN ota_getrank.task_results.pagination_hints_json IS
  'Smart pagination hints: { hotelPageMap: {hotel_id: {displayRank, pageNumber}}, scannedCount: N }';
