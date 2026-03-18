-- VPSワーカーとローカル実行の競合回避用
-- どのワーカーがタスクを取得したかを記録する
ALTER TABLE ota_getrank.job_tasks ADD COLUMN IF NOT EXISTS claimed_by text;

COMMENT ON COLUMN ota_getrank.job_tasks.claimed_by IS 'Worker ID that claimed this task (e.g. local, vps-[VPS-IP-REDACTED])';
