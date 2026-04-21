-- ============================================================
-- 0002_seed_trophies.sql
-- Seed the full NSC trophy registry (25 trophies, Section 3)
-- accumulator_group is NULL — accumulator membership lives on races.
-- ============================================================

insert into trophies (name, description, eligibility_notes, accumulator_group) values

-- Day 1
('Whitaker Cup',
 'Day 1 trophy — Race 1, first Sunday of the fortnight.',
 null,
 null),

-- Day 2
('Keen Trophy',
 'Day 2 trophy — Race 2, Monday.',
 null,
 null),

-- Day 3
('Caeau Capel Cup',
 'Day 3 trophy — Race 3, Tuesday.',
 null,
 null),

-- Day 4
('Coventry Cup',
 'Day 4 long-distance trophy — Race 4, Wednesday (longer course).',
 null,
 null),

('Fabian Gaughan Veteran''s Trophy',
 'Day 4 veterans trophy — Race 4, Wednesday (longer course).',
 'Over 50',
 null),

-- Day 5 (base PY only)
('Barnes Shield',
 'Day 5 trophy — Race 5, Thursday. Base PY only race day.',
 'Under 18',
 null),

('Arnold Bell',
 'Day 5 trophy — Race 5, Thursday. Base PY only race day.',
 'Over 18',
 null),

-- Day 6
('Spencer Trophy',
 'Day 6 trophy — Race 6, Friday.',
 'Under 12ft (boat length)',
 null),

('Tim Murphy Trophy',
 'Day 6 trophy — Race 6, Friday.',
 'Over 12ft (boat length)',
 null),

-- Day 7
('Commodore''s Tankard',
 'Day 7 trophy — Race 7, Saturday.',
 null,
 null),

('Tom Roche Trophy',
 'Day 7 veterans trophy — Race 7, Saturday.',
 'Over 45',
 null),

-- Day 8
('Lifeboat Bay Race',
 'Day 8 trophy — Race 8, Sunday (Ty-Coch landing).',
 null,
 null),

-- Day 9 (pursuit, base PY only)
('Crowther Cup',
 'Day 9 trophy — Race 9, Monday. Pursuit format (manual entry in v1). Base PY only.',
 null,
 null),

-- Day 10 (double header)
('Jones Cup',
 'Day 10 trophy — Race 10a, Tuesday 13:00 (first race of double header).',
 null,
 null),

('Wilcocks Trophy',
 'Day 10 trophy — Race 10b, Tuesday 15:00 (second race of double header).',
 null,
 null),

-- Day 11
('Partington Cannon',
 'Day 11 trophy — Race 11, Wednesday.',
 null,
 null),

('Errwood Challenge',
 'Day 11 trophy — Race 11, Wednesday.',
 'Single-handed in 2-man boat',
 null),

-- Day 12
('Andy''s Andicap',
 'Day 12 trophy — Race 12, Thursday.',
 null,
 null),

('Downes Trophy',
 'Day 12 trophy — Race 12, Thursday.',
 null,
 null),

-- Day 13
('Craven Cup',
 'Day 13 trophy — Race 13, Friday.',
 null,
 null),

-- Day 14 (base PY only)
('Richard Burrell Trophy',
 'Day 14 trophy — Race 14, Saturday. Base PY only.',
 null,
 null),

('Austin Ladies Cup',
 'Day 14 trophy — Race 14, Saturday. Base PY only.',
 null,
 null),

-- Day 15
('Gill Relay',
 'Day 15 trophy — Race 15, final Sunday of the fortnight.',
 null,
 null),

-- Additional trophies from the registry (out of scope for v1 but registered)
('Presidents Trophy',
 'President''s Trophy — format TBD each year (out of scope for v1).',
 null,
 null),

('Tom Roberts U12 Cup',
 'Tom Roberts Under-12 Cup — ad hoc, commodore''s discretion (out of scope for v1).',
 'Under 12',
 null);
