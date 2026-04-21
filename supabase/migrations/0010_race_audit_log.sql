-- Phase 11 Part C: race_audit_log for edits in locked seasons

CREATE TABLE race_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id     uuid NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  field       text NOT NULL,
  old_value   text,
  new_value   text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX race_audit_log_race_id_idx ON race_audit_log(race_id);
