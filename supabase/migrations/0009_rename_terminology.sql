-- Phase 11 Part B: rename racers → helms, boats.name → owner, boats.colour → hull_colour

-- 1. Rename the racers table
ALTER TABLE racers RENAME TO helms;

-- 2. Rename racer_id FK columns in dependent tables
ALTER TABLE race_entries RENAME COLUMN racer_id TO helm_id;
ALTER TABLE personal_handicap_history RENAME COLUMN racer_id TO helm_id;
ALTER TABLE trophy_awards RENAME COLUMN racer_id TO helm_id;

-- 3. Rename boats columns
ALTER TABLE boats RENAME COLUMN name TO owner;
ALTER TABLE boats RENAME COLUMN colour TO hull_colour;

-- 4. Recreate apply_trophy_award with updated column references
DROP FUNCTION IF EXISTS apply_trophy_award(uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION apply_trophy_award(
  p_race_id   uuid,
  p_trophy_id uuid,
  p_helm_id   uuid
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_season_id   uuid;
  v_base_py     numeric;
  v_wins_before int;
  v_deduction   numeric;
  v_delta_before numeric;
  v_delta_after  numeric;
  v_award_id    uuid;
  v_boat_id     uuid;
BEGIN
  -- Get season for this race
  SELECT season_id INTO v_season_id FROM races WHERE id = p_race_id;

  -- Get the helm's current delta and default boat's base_py
  SELECT h.personal_py_delta, b.id
  INTO v_delta_before, v_boat_id
  FROM helms h
  LEFT JOIN boats b ON b.id = h.default_boat_id
  WHERE h.id = p_helm_id;

  -- Get base_py from boat class
  SELECT bc.base_py INTO v_base_py
  FROM boats b
  JOIN boat_classes bc ON bc.id = b.class_id
  WHERE b.id = v_boat_id;

  IF v_base_py IS NULL THEN
    RAISE EXCEPTION 'Cannot determine base PY for helm %', p_helm_id;
  END IF;

  -- Count non-accumulator trophy wins this season
  SELECT COUNT(*) INTO v_wins_before
  FROM trophy_awards ta
  JOIN races r ON r.id = ta.race_id
  JOIN trophies t ON t.id = ta.trophy_id
  WHERE ta.helm_id = p_helm_id
    AND r.season_id = v_season_id
    AND t.accumulator_group IS NULL;

  -- Deduction: 3% for first win, 1% for subsequent (all off base_py, negative delta)
  IF v_wins_before = 0 THEN
    v_deduction := -ROUND(v_base_py * 0.03);
  ELSE
    v_deduction := -ROUND(v_base_py * 0.01);
  END IF;

  v_delta_after := v_delta_before + v_deduction;

  -- Update helm's personal_py_delta
  UPDATE helms SET personal_py_delta = v_delta_after WHERE id = p_helm_id;

  -- Insert trophy award
  INSERT INTO trophy_awards (race_id, trophy_id, helm_id)
  VALUES (p_race_id, p_trophy_id, p_helm_id)
  RETURNING id INTO v_award_id;

  -- Log the history
  INSERT INTO personal_handicap_history
    (helm_id, season_id, race_id, trophy_award_id, py_delta_before, py_delta_after, reason)
  VALUES
    (p_helm_id, v_season_id, p_race_id, v_award_id,
     v_delta_before, v_delta_after,
     'trophy_win');

  RETURN v_award_id;
END;
$$;

-- 5. Recreate undo_trophy_award with updated column references
DROP FUNCTION IF EXISTS undo_trophy_award(uuid);
CREATE OR REPLACE FUNCTION undo_trophy_award(p_award_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_helm_id    uuid;
  v_race_id    uuid;
  v_season_id  uuid;
  v_delta_cur  numeric;
  v_delta_new  numeric;
  v_deduction  numeric;
BEGIN
  -- Get award details
  SELECT helm_id, race_id INTO v_helm_id, v_race_id
  FROM trophy_awards WHERE id = p_award_id;

  IF v_helm_id IS NULL THEN
    RAISE EXCEPTION 'Award % not found', p_award_id;
  END IF;

  SELECT season_id INTO v_season_id FROM races WHERE id = v_race_id;

  -- Find the history row for this award to get the original deduction
  SELECT py_delta_before - py_delta_after INTO v_deduction
  FROM personal_handicap_history
  WHERE trophy_award_id = p_award_id
  LIMIT 1;

  IF v_deduction IS NULL THEN
    v_deduction := 0;
  END IF;

  -- Get current delta
  SELECT personal_py_delta INTO v_delta_cur FROM helms WHERE id = v_helm_id;
  v_delta_new := v_delta_cur + v_deduction;

  -- Restore delta
  UPDATE helms SET personal_py_delta = v_delta_new WHERE id = v_helm_id;

  -- Log compensating entry
  INSERT INTO personal_handicap_history
    (helm_id, season_id, race_id, py_delta_before, py_delta_after, reason)
  VALUES
    (v_helm_id, v_season_id, v_race_id, v_delta_cur, v_delta_new, 'trophy_win_reversed');

  -- Delete the award (FK ON DELETE SET NULL clears trophy_award_id in history)
  DELETE FROM trophy_awards WHERE id = p_award_id;
END;
$$;

-- 6. Recreate reset_season_deltas with updated column references
DROP FUNCTION IF EXISTS reset_season_deltas(uuid);
CREATE OR REPLACE FUNCTION reset_season_deltas(p_season_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, personal_py_delta FROM helms WHERE archived = false AND personal_py_delta != 0
  LOOP
    INSERT INTO personal_handicap_history
      (helm_id, season_id, py_delta_before, py_delta_after, reason)
    VALUES
      (r.id, p_season_id, r.personal_py_delta, 0, 'season_reset');

    UPDATE helms SET personal_py_delta = 0 WHERE id = r.id;
  END LOOP;
END;
$$;
