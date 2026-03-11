-- Allow the same OTA property URL to be mapped to multiple hotels
ALTER TABLE hotel_ota_mappings
  DROP CONSTRAINT IF EXISTS hotel_ota_mappings_ota_ota_property_url_key;
