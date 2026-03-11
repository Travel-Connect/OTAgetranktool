-- Add 'yahoo' to ota_type ENUM for Yahoo Travel support
ALTER TYPE ota_type ADD VALUE IF NOT EXISTS 'yahoo';
