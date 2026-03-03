-- Ensure role_rank is unique within each StoQR organisation.
-- Existing duplicates are moved to new high ranks before adding the unique index.

WITH duplicate_rows AS (
  SELECT
    id,
    company_id,
    ROW_NUMBER() OVER (PARTITION BY company_id, role_rank ORDER BY created_at, id) AS duplicate_index
  FROM stoqr.roles
),
company_max_rank AS (
  SELECT company_id, COALESCE(MAX(role_rank), 0) AS max_rank
  FROM stoqr.roles
  GROUP BY company_id
),
reassigned_duplicates AS (
  SELECT
    duplicate_rows.id,
    duplicate_rows.company_id,
    company_max_rank.max_rank
      + ROW_NUMBER() OVER (PARTITION BY duplicate_rows.company_id ORDER BY duplicate_rows.id) AS new_role_rank
  FROM duplicate_rows
  JOIN company_max_rank ON company_max_rank.company_id = duplicate_rows.company_id
  WHERE duplicate_rows.duplicate_index > 1
)
UPDATE stoqr.roles AS roles
SET role_rank = reassigned_duplicates.new_role_rank
FROM reassigned_duplicates
WHERE roles.id = reassigned_duplicates.id;

CREATE UNIQUE INDEX IF NOT EXISTS stoqr_roles_company_id_role_rank_uidx
  ON stoqr.roles (company_id, role_rank);
