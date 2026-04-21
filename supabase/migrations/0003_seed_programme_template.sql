-- ============================================================
-- 0003_seed_programme_template.sql
-- create_season_from_template(p_year int) → uuid
--
-- Computes the NSC 15-day fortnight dates, creates a draft season,
-- inserts 16 race rows (day 10 is a double header), links trophies.
--
-- Season date derivation (Section 2):
--   bank_holiday_monday = last Monday of August of p_year
--   start_date          = bank_holiday_monday − 29 days  (must be Sunday)
--   end_date            = start_date + 14 days
-- ============================================================

create or replace function create_season_from_template(p_year int)
returns uuid
language plpgsql
as $$
declare
  v_aug_first        date;
  v_bank_holiday_mon date;
  v_start_date       date;
  v_end_date         date;
  v_season_id        uuid;
  v_race_id          uuid;

  -- trophy id cache
  t_whitaker          uuid;
  t_keen              uuid;
  t_caeau_capel       uuid;
  t_coventry          uuid;
  t_fabian            uuid;
  t_barnes            uuid;
  t_arnold_bell       uuid;
  t_spencer           uuid;
  t_tim_murphy        uuid;
  t_commodores        uuid;
  t_tom_roche         uuid;
  t_lifeboat          uuid;
  t_crowther          uuid;
  t_jones             uuid;
  t_wilcocks          uuid;
  t_partington        uuid;
  t_errwood           uuid;
  t_andys_andicap     uuid;
  t_downes            uuid;
  t_craven            uuid;
  t_richard_burrell   uuid;
  t_austin_ladies     uuid;
  t_gill_relay        uuid;
begin
  -- ──────────────────────────────────────────────────────────
  -- 1. Compute dates
  -- ──────────────────────────────────────────────────────────
  v_aug_first := make_date(p_year, 8, 1);

  -- Last Monday of August: start from Aug 31 and walk back to Monday.
  -- Use integer subtraction (date - int = date) to keep the result typed as date.
  v_bank_holiday_mon := make_date(p_year, 8, 31)
    - ((extract(dow from make_date(p_year, 8, 31))::int + 6) % 7);

  v_start_date := v_bank_holiday_mon - 29;
  v_end_date   := v_start_date + 14;

  -- Sanity check: start_date must be a Sunday (dow = 0)
  if extract(dow from v_start_date)::int <> 0 then
    raise exception
      'Season start % is not a Sunday (dow=%). Check date derivation for year %.',
      v_start_date,
      extract(dow from v_start_date)::int,
      p_year;
  end if;

  -- ──────────────────────────────────────────────────────────
  -- 2. Cache trophy ids
  -- ──────────────────────────────────────────────────────────
  select id into strict t_whitaker        from trophies where name = 'Whitaker Cup';
  select id into strict t_keen            from trophies where name = 'Keen Trophy';
  select id into strict t_caeau_capel     from trophies where name = 'Caeau Capel Cup';
  select id into strict t_coventry        from trophies where name = 'Coventry Cup';
  select id into strict t_fabian          from trophies where name = 'Fabian Gaughan Veteran''s Trophy';
  select id into strict t_barnes          from trophies where name = 'Barnes Shield';
  select id into strict t_arnold_bell     from trophies where name = 'Arnold Bell';
  select id into strict t_spencer         from trophies where name = 'Spencer Trophy';
  select id into strict t_tim_murphy      from trophies where name = 'Tim Murphy Trophy';
  select id into strict t_commodores      from trophies where name = 'Commodore''s Tankard';
  select id into strict t_tom_roche       from trophies where name = 'Tom Roche Trophy';
  select id into strict t_lifeboat        from trophies where name = 'Lifeboat Bay Race';
  select id into strict t_crowther        from trophies where name = 'Crowther Cup';
  select id into strict t_jones           from trophies where name = 'Jones Cup';
  select id into strict t_wilcocks        from trophies where name = 'Wilcocks Trophy';
  select id into strict t_partington      from trophies where name = 'Partington Cannon';
  select id into strict t_errwood         from trophies where name = 'Errwood Challenge';
  select id into strict t_andys_andicap   from trophies where name = 'Andy''s Andicap';
  select id into strict t_downes          from trophies where name = 'Downes Trophy';
  select id into strict t_craven          from trophies where name = 'Craven Cup';
  select id into strict t_richard_burrell from trophies where name = 'Richard Burrell Trophy';
  select id into strict t_austin_ladies   from trophies where name = 'Austin Ladies Cup';
  select id into strict t_gill_relay      from trophies where name = 'Gill Relay';

  -- ──────────────────────────────────────────────────────────
  -- 3. Insert season
  -- ──────────────────────────────────────────────────────────
  insert into seasons (year, start_date, end_date, status)
  values (p_year, v_start_date, v_end_date, 'draft')
  returning id into v_season_id;

  -- ──────────────────────────────────────────────────────────
  -- 4. Insert races & link trophies
  --    16 race rows: days 0..14 plus day 9 is split into 10a/10b
  --    day_offset 0 = start_date (Sunday week 1)
  -- ──────────────────────────────────────────────────────────

  -- Day 0 (offset 0) — Race 1 — Whitaker Cup
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 0, 'Race 1', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order)
  values (v_race_id, t_whitaker, 0);

  -- Day 1 (offset 1) — Race 2 — Keen Trophy
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 1, 'Race 2', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order)
  values (v_race_id, t_keen, 0);

  -- Day 2 (offset 2) — Race 3 — Caeau Capel Cup
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 2, 'Race 3', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order)
  values (v_race_id, t_caeau_capel, 0);

  -- Day 3 (offset 3) — Race 4 — Coventry Cup (main) + Fabian Gaughan (secondary)
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 3, 'Race 4', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order) values
    (v_race_id, t_coventry, 0),
    (v_race_id, t_fabian,   1);

  -- Day 4 (offset 4) — Race 5 — Barnes Shield (U18 main) + Arnold Bell (over 18)
  -- Base PY only
  insert into races (season_id, day_offset, name, start_time, use_base_py_only)
  values (v_season_id, 4, 'Race 5', '14:00', true) returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order) values
    (v_race_id, t_barnes,      0),
    (v_race_id, t_arnold_bell, 1);

  -- Day 5 (offset 5) — Race 6 — Spencer Trophy + Tim Murphy Trophy
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 5, 'Race 6', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order) values
    (v_race_id, t_spencer,    0),
    (v_race_id, t_tim_murphy, 1);

  -- Day 6 (offset 6) — Race 7 — Commodore's Tankard + Tom Roche Trophy
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 6, 'Race 7', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order) values
    (v_race_id, t_commodores, 0),
    (v_race_id, t_tom_roche,  1);

  -- Day 7 (offset 7) — Race 8 — Lifeboat Bay Race
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 7, 'Race 8', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order)
  values (v_race_id, t_lifeboat, 0);

  -- Day 8 (offset 8) — Race 9 — Crowther Cup — pursuit, base PY only
  insert into races (season_id, day_offset, name, start_time, use_base_py_only, is_pursuit)
  values (v_season_id, 8, 'Race 9', '14:00', true, true) returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order)
  values (v_race_id, t_crowther, 0);

  -- Day 9 (offset 9) — Double header —————————————————————————
  -- Race 10a — Jones Cup — 13:00
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 9, 'Race 10a', '13:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order)
  values (v_race_id, t_jones, 0);

  -- Race 10b — Wilcocks Trophy — 15:00
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 9, 'Race 10b', '15:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order)
  values (v_race_id, t_wilcocks, 0);
  -- ——————————————————————————————————————————————————————————

  -- Day 10 (offset 10) — Race 11 — Partington Cannon + Errwood Challenge
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 10, 'Race 11', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order) values
    (v_race_id, t_partington, 0),
    (v_race_id, t_errwood,    1);

  -- Day 11 (offset 11) — Race 12 — Andy's Andicap + Downes Trophy
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 11, 'Race 12', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order) values
    (v_race_id, t_andys_andicap, 0),
    (v_race_id, t_downes,        1);

  -- Day 12 (offset 12) — Race 13 — Craven Cup
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 12, 'Race 13', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order)
  values (v_race_id, t_craven, 0);

  -- Day 13 (offset 13) — Race 14 — Richard Burrell Trophy + Austin Ladies Cup — base PY only
  insert into races (season_id, day_offset, name, start_time, use_base_py_only)
  values (v_season_id, 13, 'Race 14', '14:00', true) returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order) values
    (v_race_id, t_richard_burrell, 0),
    (v_race_id, t_austin_ladies,   1);

  -- Day 14 (offset 14) — Race 15 — Gill Relay
  insert into races (season_id, day_offset, name, start_time)
  values (v_season_id, 14, 'Race 15', '14:00') returning id into v_race_id;
  insert into race_trophies (race_id, trophy_id, display_order)
  values (v_race_id, t_gill_relay, 0);

  return v_season_id;
end;
$$;
