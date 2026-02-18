-- Consolidate Embraer family keys so ERJ-170/175/190 are the single canonical keys.
-- Aligns with app: normalizeAircraftFamily() and catalog_entity_tags use these canonical keys.

-- 1) log_entries: set aircraft_make_model to canonical display name for each family group
UPDATE log_entries
SET aircraft_make_model = 'ERJ-170'
WHERE upper(trim(aircraft_make_model)) IN ('EMB-170', 'ERJ-170', 'FMB-170')
   OR aircraft_make_model ILIKE '%ERJ 170%'
   OR aircraft_make_model ILIKE '%ERJ170%'
   OR aircraft_make_model ILIKE '%EMB-170%';

UPDATE log_entries
SET aircraft_make_model = 'ERJ-175'
WHERE upper(trim(aircraft_make_model)) IN ('EMB-175', 'ERJ-175')
   OR aircraft_make_model ILIKE '%ERJ 175%'
   OR aircraft_make_model ILIKE '%ERJ175%'
   OR aircraft_make_model ILIKE '%EMB-175%';

UPDATE log_entries
SET aircraft_make_model = 'ERJ-190'
WHERE upper(trim(aircraft_make_model)) IN ('EMB-190', 'ERJ-190')
   OR aircraft_make_model ILIKE '%ERJ 190%'
   OR aircraft_make_model ILIKE '%ERJ190%'
   OR aircraft_make_model ILIKE '%EMB-190%';

-- 2) catalog_entity_tags: set entity_id to canonical key for family rows in each group
UPDATE catalog_entity_tags
SET entity_id = 'ERJ-170'
WHERE entity_type = 'family'
  AND upper(trim(entity_id)) IN ('EMB-170', 'ERJ-170', 'FMB-170');

UPDATE catalog_entity_tags
SET entity_id = 'ERJ-175'
WHERE entity_type = 'family'
  AND upper(trim(entity_id)) IN ('EMB-175', 'ERJ-175');

UPDATE catalog_entity_tags
SET entity_id = 'ERJ-190'
WHERE entity_type = 'family'
  AND upper(trim(entity_id)) IN ('EMB-190', 'ERJ-190');

-- 3) Remove duplicate (user_id, entity_type, entity_id, tag) rows, keeping one per group
DELETE FROM catalog_entity_tags a
USING catalog_entity_tags b
WHERE a.user_id = b.user_id
  AND a.entity_type = b.entity_type
  AND a.entity_id = b.entity_id
  AND a.tag = b.tag
  AND a.id > b.id;
