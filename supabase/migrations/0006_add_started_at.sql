-- Record the actual timestamp when a race is started (distinct from the
-- planned start_time which is a time-of-day value from the template).
alter table races add column started_at timestamptz;
