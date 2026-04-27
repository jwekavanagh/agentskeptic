CREATE TABLE IF NOT EXISTS enforcement_baseline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workflow_id text NOT NULL,
  projection_hash text NOT NULL,
  projection jsonb NOT NULL,
  accepted_by_key_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enforcement_baseline_user_workflow_unique UNIQUE (user_id, workflow_id)
);

CREATE TABLE IF NOT EXISTS enforcement_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workflow_id text NOT NULL,
  run_id text NOT NULL,
  event text NOT NULL,
  expected_projection_hash text,
  actual_projection_hash text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enforcement_event_user_workflow_created_idx
  ON enforcement_event (user_id, workflow_id, created_at DESC);
