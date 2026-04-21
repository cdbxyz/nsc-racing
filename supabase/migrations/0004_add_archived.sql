-- Add archived flag to boat_classes, boats, and racers so records can be
-- hidden from active dropdowns without losing historical references.
-- Also widen default_laps to numeric(5,2) to support fractional lap counts.

ALTER TABLE boat_classes
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ALTER COLUMN default_laps TYPE numeric(5,2);

ALTER TABLE boats
  ADD COLUMN archived boolean NOT NULL DEFAULT false;

ALTER TABLE racers
  ADD COLUMN archived boolean NOT NULL DEFAULT false;
