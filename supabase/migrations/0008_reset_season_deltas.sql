-- ============================================================
-- 0008_reset_season_deltas.sql
-- Phase 9: make personal_handicap_history.race_id nullable so
-- season-reset rows are not tied to a specific race; add the
-- reset_season_deltas function.
-- ============================================================

alter table personal_handicap_history
  alter column race_id drop not null;

-- ============================================================
-- reset_season_deltas
-- Zeroes personal_py_delta for all non-archived racers and
-- records a history marker row per racer.
-- p_season_id is the season the reset is associated with.
-- ============================================================
create or replace function reset_season_deltas(
  p_season_id uuid
) returns void language plpgsql as $$
declare
  r record;
begin
  for r in
    select id, personal_py_delta from racers
    where archived = false
  loop
    -- Only record a history row if there was a non-zero delta
    if r.personal_py_delta <> 0 then
      insert into personal_handicap_history
        (racer_id, season_id, race_id, trophy_award_id, py_delta_before, py_delta_after, reason)
      values
        (r.id, p_season_id, null, null, r.personal_py_delta, 0, 'season reset');
    end if;

    update racers set personal_py_delta = 0 where id = r.id;
  end loop;
end;
$$;
