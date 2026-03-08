-- Remove blank approach entries from ALL log_entries (follow-up: fix rows that only had legacy approachCount/approachType).
-- Blank = count 0 or missing, or type null/empty/whitespace/'Unknown'.
-- Uses performance.approaches when present; otherwise builds from legacy approachCount/approachType, then filters.
-- Ensures approachCount/approachType are cleared when there are no real approaches.

WITH effective_approaches AS (
  SELECT
    le.id,
    le.performance,
    CASE
      WHEN jsonb_typeof(le.performance->'approaches') = 'array' THEN le.performance->'approaches'
      WHEN COALESCE((le.performance->>'approachCount')::int, 0) > 0
           AND NULLIF(TRIM(COALESCE(le.performance->>'approachType', '')), '') IS NOT NULL
           AND LOWER(TRIM(COALESCE(le.performance->>'approachType', ''))) <> 'unknown'
        THEN jsonb_build_array(
          jsonb_build_object(
            'type', le.performance->>'approachType',
            'count', (le.performance->>'approachCount')::int
          )
        )
      ELSE '[]'::jsonb
    END AS approaches_raw
  FROM log_entries le
),
filtered AS (
  SELECT
    ea.id,
    ea.performance,
    (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(ea.approaches_raw) AS elem
      WHERE COALESCE((elem->>'count')::int, 0) > 0
        AND NULLIF(TRIM(COALESCE(elem->>'type', '')), '') IS NOT NULL
        AND LOWER(NULLIF(TRIM(COALESCE(elem->>'type', '')), '')) <> 'unknown'
    ) AS approaches
  FROM effective_approaches ea
),
with_derived AS (
  SELECT
    f.id,
    f.performance,
    f.approaches,
    (SELECT SUM((e->>'count')::int) FROM jsonb_array_elements(f.approaches) AS e) AS approach_count,
    (SELECT e->>'type' FROM jsonb_array_elements(f.approaches) AS e LIMIT 1) AS approach_type
  FROM filtered f
)
UPDATE log_entries le
SET performance = le.performance || jsonb_build_object(
  'approaches', wd.approaches,
  'approachCount', CASE WHEN wd.approach_count > 0 THEN wd.approach_count ELSE NULL END,
  'approachType', wd.approach_type
)
FROM with_derived wd
WHERE le.id = wd.id;
