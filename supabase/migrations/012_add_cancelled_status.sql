-- Add 'cancelled' to job_status enum
ALTER TYPE ota_getrank.job_status ADD VALUE IF NOT EXISTS 'cancelled';
