-- 011_add_claimed_by.sql で COMMENT 文に VPS の IP アドレスを書いてしまっていたため、
-- pg_description から該当文字列を除去する。
COMMENT ON COLUMN ota_getrank.job_tasks.claimed_by IS 'Worker ID that claimed this task (e.g. local, vps)';
