-- ============================================================
-- 0007_trophy_award_functions.sql
-- Phase 8: make trophy_award_id nullable, add award/undo RPCs
-- ============================================================

-- Allow trophy_award_id to be null so undo can delete the award
-- while preserving the audit trail in personal_handicap_history.
alter table personal_handicap_history
  alter column trophy_award_id drop not null;

alter table personal_handicap_history
  drop constraint personal_handicap_history_trophy_award_id_fkey,
  add constraint personal_handicap_history_trophy_award_id_fkey
    foreign key (trophy_award_id)
    references trophy_awards (id)
    on delete set null;

-- ============================================================
-- apply_trophy_award
-- Inserts the trophy_award row, applies the PY deduction to the
-- racer, and records a personal_handicap_history entry.
-- Returns the new trophy_award id.
-- ============================================================
create or replace function apply_trophy_award(
  p_race_id    uuid,
  p_trophy_id  uuid,
  p_racer_id   uuid
) returns uuid language plpgsql as $$
declare
  v_season_id      uuid;
  v_base_py        int;
  v_prior_wins     int;
  v_delta          int;
  v_py_before      int;
  v_py_after       int;
  v_award_id       uuid;
begin
  -- Resolve season for this race
  select season_id into strict v_season_id
    from races where id = p_race_id;

  -- Get base PY snapshot for this racer in this race
  select base_py_snapshot into strict v_base_py
    from race_entries
   where race_id = p_race_id and racer_id = p_racer_id;

  -- Count prior non-accumulator trophy wins this season
  select count(*)::int into v_prior_wins
    from trophy_awards ta
    join races r on r.id = ta.race_id
    join trophies t on t.id = ta.trophy_id
   where ta.racer_id = p_racer_id
     and r.season_id = v_season_id
     and t.accumulator_group is null;

  -- 3% for first win, 1% for each subsequent
  v_delta := case when v_prior_wins = 0
                  then round(v_base_py * 0.03)
                  else round(v_base_py * 0.01)
             end;

  -- Read current racer delta before applying
  select personal_py_delta into strict v_py_before
    from racers where id = p_racer_id;

  v_py_after := v_py_before - v_delta;

  -- Insert trophy award
  insert into trophy_awards (race_id, trophy_id, racer_id)
  values (p_race_id, p_trophy_id, p_racer_id)
  returning id into v_award_id;

  -- Apply deduction to racer
  update racers
     set personal_py_delta = v_py_after
   where id = p_racer_id;

  -- Audit trail
  insert into personal_handicap_history
    (racer_id, season_id, race_id, trophy_award_id, py_delta_before, py_delta_after, reason)
  values
    (p_racer_id, v_season_id, p_race_id, v_award_id, v_py_before, v_py_after,
     case when v_prior_wins = 0 then 'First win this season: -3% base PY'
          else 'Win this season: -1% base PY'
     end);

  return v_award_id;
end;
$$;

-- ============================================================
-- undo_trophy_award
-- Reverses the PY deduction, inserts a compensating history row,
-- then deletes the trophy_award (ON DELETE SET NULL clears FKs).
-- ============================================================
create or replace function undo_trophy_award(
  p_award_id uuid
) returns void language plpgsql as $$
declare
  v_racer_id   uuid;
  v_race_id    uuid;
  v_season_id  uuid;
  v_py_before  int;  -- value before original deduction
  v_py_after   int;  -- value after original deduction (current racer delta)
begin
  -- Get award details
  select racer_id, race_id into strict v_racer_id, v_race_id
    from trophy_awards where id = p_award_id;

  select season_id into strict v_season_id
    from races where id = v_race_id;

  -- Find the history row for this award to know what was deducted
  select py_delta_before, py_delta_after
    into strict v_py_before, v_py_after
    from personal_handicap_history
   where trophy_award_id = p_award_id
   order by created_at
   limit 1;

  -- Insert compensating history row (reversal)
  -- trophy_award_id is set here; ON DELETE SET NULL will null it when award is deleted
  insert into personal_handicap_history
    (racer_id, season_id, race_id, trophy_award_id, py_delta_before, py_delta_after, reason)
  values
    (v_racer_id, v_season_id, v_race_id, p_award_id, v_py_after, v_py_before,
     'Trophy award undone: deduction reversed');

  -- Restore racer PY to what it was before the award
  update racers
     set personal_py_delta = v_py_before
   where id = v_racer_id;

  -- Delete award — ON DELETE SET NULL clears trophy_award_id on all history rows
  delete from trophy_awards where id = p_award_id;
end;
$$;
