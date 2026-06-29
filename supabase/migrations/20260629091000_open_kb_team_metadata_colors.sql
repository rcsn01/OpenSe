-- Backfill Open-KB team colors into existing metadata.

WITH palette(color, ordinal) AS (
  VALUES
    ('#bfdbfe'::text, 0),
    ('#bbf7d0'::text, 1),
    ('#fecaca'::text, 2),
    ('#fed7aa'::text, 3),
    ('#fde68a'::text, 4),
    ('#c4b5fd'::text, 5),
    ('#a7f3d0'::text, 6),
    ('#bae6fd'::text, 7),
    ('#fbcfe8'::text, 8),
    ('#ddd6fe'::text, 9),
    ('#ccfbf1'::text, 10),
    ('#e9d5ff'::text, 11)
),
teams_missing_color AS (
  SELECT
    t.id,
    (row_number() OVER (ORDER BY t.organisation_id, lower(coalesce(t.name, t.slug, t.id::text)), t.id) - 1) % 12 AS palette_ordinal
  FROM kb.teams t
  WHERE t.deleted_at IS NULL
    AND coalesce(t.status, 'active') = 'active'
    AND nullif(t.metadata->>'color', '') IS NULL
)
UPDATE kb.teams t
SET metadata = jsonb_set(coalesce(t.metadata, '{}'::jsonb), '{color}', to_jsonb(p.color), true)
FROM teams_missing_color missing
JOIN palette p ON p.ordinal = missing.palette_ordinal
WHERE t.id = missing.id;
