-- Auto-lock a season when any of its races transitions from draft → running.
-- This fires AFTER UPDATE on races; if the race goes to 'running' and was
-- previously 'draft', the parent season is set to 'locked'.

create or replace function lock_season_on_race_start()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'draft' and new.status = 'running' then
    update seasons
    set status = 'locked'
    where id = new.season_id
      and status = 'draft';
  end if;
  return new;
end;
$$;

create trigger auto_lock_season
  after update on races
  for each row execute function lock_season_on_race_start();
