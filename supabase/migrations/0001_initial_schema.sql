-- ============================================================
-- 0001_initial_schema.sql
-- Full NSC Racing schema: enums, tables, indexes, RLS, triggers
-- ============================================================

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type season_status   as enum ('draft', 'locked');
create type race_status     as enum ('draft', 'running', 'finished');
create type entry_status    as enum ('racing', 'FIN', 'DNF', 'DNS', 'DSQ', 'RET', 'OCS', 'DNC');

-- ------------------------------------------------------------
-- updated_at trigger function (shared by all tables)
-- ------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Seasons
-- ------------------------------------------------------------

create table seasons (
  id          uuid primary key default gen_random_uuid(),
  year        int  not null unique,
  start_date  date not null,
  end_date    date not null,
  status      season_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger seasons_updated_at
  before update on seasons
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Boat classes
-- ------------------------------------------------------------

create table boat_classes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  base_py      int  not null check (base_py > 0),
  default_laps int  not null default 3 check (default_laps > 0),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger boat_classes_updated_at
  before update on boat_classes
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Boats
-- ------------------------------------------------------------

create table boats (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references boat_classes (id) on delete restrict,
  sail_number text not null,
  name        text,
  colour      text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index boats_class_id_idx on boats (class_id);

create trigger boats_updated_at
  before update on boats
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Racers
-- ------------------------------------------------------------

create table racers (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  display_name        text not null,
  default_boat_id     uuid references boats (id) on delete set null,
  personal_py_delta   int  not null default 0,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index racers_default_boat_id_idx on racers (default_boat_id);

create trigger racers_updated_at
  before update on racers
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Trophies
-- ------------------------------------------------------------

create table trophies (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  description       text,
  eligibility_notes text,
  accumulator_group text check (accumulator_group in ('francis_1', 'francis_2', 'garside')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger trophies_updated_at
  before update on trophies
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Races
-- ------------------------------------------------------------

create table races (
  id                 uuid primary key default gen_random_uuid(),
  season_id          uuid not null references seasons (id) on delete restrict,
  day_offset         int  not null check (day_offset between 0 and 14),
  name               text not null,
  start_time         time not null default '14:00',
  reference_laps     int  check (reference_laps > 0),
  course_description text,
  use_base_py_only   boolean not null default false,
  is_pursuit         boolean not null default false,
  status             race_status not null default 'draft',
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index races_season_id_idx on races (season_id);

create trigger races_updated_at
  before update on races
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Race trophies (join table)
-- ------------------------------------------------------------

create table race_trophies (
  race_id       uuid not null references races    (id) on delete cascade,
  trophy_id     uuid not null references trophies (id) on delete restrict,
  display_order int  not null default 0,
  primary key (race_id, trophy_id),
  created_at    timestamptz not null default now()
);

create index race_trophies_trophy_id_idx on race_trophies (trophy_id);

-- ------------------------------------------------------------
-- Race entries
-- ------------------------------------------------------------

create table race_entries (
  id                           uuid primary key default gen_random_uuid(),
  race_id                      uuid not null references races   (id) on delete restrict,
  racer_id                     uuid not null references racers  (id) on delete restrict,
  boat_id                      uuid not null references boats   (id) on delete restrict,
  -- PY snapshots taken at race start
  class_id_snapshot            uuid references boat_classes (id) on delete set null,
  base_py_snapshot             int,
  personal_py_delta_snapshot   int,
  effective_py_snapshot        int,
  laps_to_sail                 int  check (laps_to_sail > 0),
  status                       entry_status not null default 'racing',
  -- Timing (ms since epoch or race start, as appropriate)
  finish_time_ms               bigint,
  elapsed_ms                   bigint,
  normalised_elapsed_ms        bigint,
  corrected_ms                 bigint,
  position_overall             int  check (position_overall > 0),
  position_class               int  check (position_class > 0),
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  unique (race_id, racer_id)
);

create index race_entries_race_id_idx    on race_entries (race_id);
create index race_entries_racer_id_idx   on race_entries (racer_id);
create index race_entries_boat_id_idx    on race_entries (boat_id);

create trigger race_entries_updated_at
  before update on race_entries
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Lap times
-- ------------------------------------------------------------

create table lap_times (
  id                    uuid primary key default gen_random_uuid(),
  race_entry_id         uuid not null references race_entries (id) on delete cascade,
  lap_number            int  not null check (lap_number > 0),
  cumulative_elapsed_ms bigint not null,
  created_at            timestamptz not null default now(),
  unique (race_entry_id, lap_number)
);

create index lap_times_race_entry_id_idx on lap_times (race_entry_id);

-- ------------------------------------------------------------
-- Trophy awards
-- ------------------------------------------------------------

create table trophy_awards (
  id         uuid primary key default gen_random_uuid(),
  race_id    uuid not null references races    (id) on delete restrict,
  trophy_id  uuid not null references trophies (id) on delete restrict,
  racer_id   uuid not null references racers   (id) on delete restrict,
  notes      text,
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trophy_awards_race_id_idx   on trophy_awards (race_id);
create index trophy_awards_trophy_id_idx on trophy_awards (trophy_id);
create index trophy_awards_racer_id_idx  on trophy_awards (racer_id);

create trigger trophy_awards_updated_at
  before update on trophy_awards
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Personal handicap history
-- ------------------------------------------------------------

create table personal_handicap_history (
  id               uuid primary key default gen_random_uuid(),
  racer_id         uuid not null references racers        (id) on delete restrict,
  season_id        uuid not null references seasons       (id) on delete restrict,
  race_id          uuid not null references races         (id) on delete restrict,
  trophy_award_id  uuid not null references trophy_awards (id) on delete restrict,
  py_delta_before  int  not null,
  py_delta_after   int  not null,
  reason           text,
  created_at       timestamptz not null default now()
);

create index phh_racer_id_idx        on personal_handicap_history (racer_id);
create index phh_season_id_idx       on personal_handicap_history (season_id);
create index phh_trophy_award_id_idx on personal_handicap_history (trophy_award_id);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table seasons                  enable row level security;
alter table boat_classes             enable row level security;
alter table boats                    enable row level security;
alter table racers                   enable row level security;
alter table trophies                 enable row level security;
alter table races                    enable row level security;
alter table race_trophies            enable row level security;
alter table race_entries             enable row level security;
alter table lap_times                enable row level security;
alter table trophy_awards            enable row level security;
alter table personal_handicap_history enable row level security;

-- anon can SELECT every table; all writes go through service role which bypasses RLS
create policy "anon_select_seasons"   on seasons                   for select to anon using (true);
create policy "anon_select_boat_classes" on boat_classes           for select to anon using (true);
create policy "anon_select_boats"     on boats                     for select to anon using (true);
create policy "anon_select_racers"    on racers                    for select to anon using (true);
create policy "anon_select_trophies"  on trophies                  for select to anon using (true);
create policy "anon_select_races"     on races                     for select to anon using (true);
create policy "anon_select_race_trophies" on race_trophies         for select to anon using (true);
create policy "anon_select_race_entries" on race_entries           for select to anon using (true);
create policy "anon_select_lap_times" on lap_times                 for select to anon using (true);
create policy "anon_select_trophy_awards" on trophy_awards         for select to anon using (true);
create policy "anon_select_phh"       on personal_handicap_history for select to anon using (true);
