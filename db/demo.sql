-- Demo data: one account with a year of habits, check-ins, relapses and goals.
--
--   Sign in:  demo@habit.test / demo-habits-2026   (two-factor off)
--
-- Loaded by hand, never on boot, into the app's database:
--   local:   mysql -uroot -p habit_shaper < db/demo.sql
--   Docker:  docker compose exec -T db sh -c 'mysql -uroot -p"$(cat /secrets/mysql_root_password)" "$(cat /secrets/mysql_database)"' < db/demo.sql
-- Never load it into a deployment other people can reach: the password above is public.
--
-- Running it again replaces the demo account and everything it owns (the
-- foreign keys cascade). Every day is relative to CURDATE(), so the data is
-- current whenever it is loaded; CURDATE() is the database server's date, so
-- a server in UTC and a browser far from it can disagree on "today" by one.
-- The pattern behind each habit is deterministic: CRC32 of the habit and the day.

START TRANSACTION;

DELETE FROM users WHERE email = 'demo@habit.test';

-- The hash is argon2id, as backend/src/lib/password.ts stores it.
INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES
  ('de000000-0000-4000-8000-000000000001', 'Dina Pratama', 'demo@habit.test',
   '$argon2id$v=19$m=65536,t=3,p=4$tfQhVeAtQ/vN20H4r0QToQ$VBVFGqh98Tx28NB126DLAk7D4bl6/NRaT+UCsm0qcAA',
   CURDATE() - INTERVAL 345 DAY + INTERVAL 9 HOUR, NOW(3));

SET @u = 'de000000-0000-4000-8000-000000000001';

-- Days 0 (today) to 399 back.
CREATE TEMPORARY TABLE demo_days (n INT PRIMARY KEY);
INSERT INTO demo_days (n)
  SELECT a.d + b.d * 10 + c.d * 100
  FROM (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
       (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
       (SELECT 0 d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) c;

-- ---------------------------------------------------------------- habits
-- Icons are the keys in backend/src/modules/habits/schemas.ts.
INSERT INTO habits (id, user_id, name, type, icon, started_on, archived_at, created_at, updated_at) VALUES
  ('de000000-0000-4000-8000-000000000101', @u, 'Drink 8 glasses of water',  'build', 'water',    CURDATE() - INTERVAL 340 DAY, NULL, CURDATE() - INTERVAL 340 DAY + INTERVAL 8 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000102', @u, 'Read 20 pages',             'build', 'book',     CURDATE() - INTERVAL 250 DAY, NULL, CURDATE() - INTERVAL 250 DAY + INTERVAL 8 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000103', @u, 'Morning run',               'build', 'run',      CURDATE() - INTERVAL 150 DAY, NULL, CURDATE() - INTERVAL 150 DAY + INTERVAL 8 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000104', @u, 'Meditate for 10 minutes',   'build', 'meditate', CURDATE() - INTERVAL 90 DAY,  NULL, CURDATE() - INTERVAL 90 DAY + INTERVAL 8 HOUR,  NOW(3)),
  ('de000000-0000-4000-8000-000000000105', @u, 'Journal before bed',        'build', 'journal',  CURDATE() - INTERVAL 60 DAY,  NULL, CURDATE() - INTERVAL 60 DAY + INTERVAL 8 HOUR,  NOW(3)),
  ('de000000-0000-4000-8000-000000000106', @u, 'Lights out by 11 pm',       'build', 'sleep',    CURDATE() - INTERVAL 35 DAY,  NULL, CURDATE() - INTERVAL 35 DAY + INTERVAL 8 HOUR,  NOW(3)),
  ('de000000-0000-4000-8000-000000000107', @u, 'Cook a meal at home',       'build', 'food',     CURDATE() - INTERVAL 18 DAY,  NULL, CURDATE() - INTERVAL 18 DAY + INTERVAL 8 HOUR,  NOW(3)),
  ('de000000-0000-4000-8000-000000000108', @u, '10 minutes of morning sun', 'build', 'sun',      CURDATE() - INTERVAL 6 DAY,   NULL, CURDATE() - INTERVAL 6 DAY + INTERVAL 8 HOUR,   NOW(3)),
  ('de000000-0000-4000-8000-000000000111', @u, 'Smoking',                   'break', 'smoke',    CURDATE() - INTERVAL 300 DAY, NULL, CURDATE() - INTERVAL 300 DAY + INTERVAL 8 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000112', @u, 'Scrolling after midnight',  'break', 'phone',    CURDATE() - INTERVAL 120 DAY, NULL, CURDATE() - INTERVAL 120 DAY + INTERVAL 8 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000113', @u, 'Coffee after 3 pm',         'break', 'coffee',   CURDATE() - INTERVAL 45 DAY,  NULL, CURDATE() - INTERVAL 45 DAY + INTERVAL 8 HOUR,  NOW(3)),
  -- Deleted in the app: archived with its goal, its log kept.
  ('de000000-0000-4000-8000-000000000121', @u, 'Evening yoga',              'build', 'heart',    CURDATE() - INTERVAL 200 DAY, NOW(3) - INTERVAL 40 DAY, CURDATE() - INTERVAL 200 DAY + INTERVAL 8 HOUR, NOW(3) - INTERVAL 40 DAY);

-- ------------------------------------------------------ build check-ins
-- A plan per habit, `n` days back from today:
--   today   1 = done today, 0 = still open
--   streak  done every day from yesterday back this many days; the day before is missed
--   pct     earlier, a day is done with this chance (0–100)
--   days    if set, only these weekdays mostly (DAYOFWEEK: 1 = Sunday); the rest rarely
--   ended   no log after this many days ago (the archived habit)
CREATE TEMPORARY TABLE demo_plan (habit_id CHAR(36), started INT, ended INT, today TINYINT, streak INT, pct INT, days VARCHAR(20));
INSERT INTO demo_plan VALUES
  ('de000000-0000-4000-8000-000000000101', 340, 0,  1, 34, 82, NULL),
  ('de000000-0000-4000-8000-000000000102', 250, 0,  1, 12, 70, NULL),
  ('de000000-0000-4000-8000-000000000103', 150, 0,  0, 3,  85, '2,4,6,7'),
  ('de000000-0000-4000-8000-000000000104', 90,  0,  1, 41, 75, NULL),
  ('de000000-0000-4000-8000-000000000105', 60,  0,  0, 5,  62, NULL),
  ('de000000-0000-4000-8000-000000000106', 35,  0,  0, 0,  66, NULL),
  ('de000000-0000-4000-8000-000000000107', 18,  0,  1, 2,  72, NULL),
  ('de000000-0000-4000-8000-000000000108', 6,   0,  0, 1,  50, NULL),
  ('de000000-0000-4000-8000-000000000121', 200, 41, 0, 0,  80, '1,3,5');

INSERT INTO habit_logs (id, habit_id, date, created_at)
  SELECT UUID(), p.habit_id, CURDATE() - INTERVAL d.n DAY,
         LEAST(TIMESTAMP(CURDATE() - INTERVAL d.n DAY, '20:30:00'), NOW(3))
  FROM demo_plan p
  JOIN demo_days d ON d.n BETWEEN p.ended AND p.started
  WHERE CASE
    WHEN d.n = 0 THEN p.today = 1
    WHEN d.n <= p.streak THEN TRUE
    WHEN d.n = p.streak + 1 THEN FALSE
    WHEN p.days IS NOT NULL AND FIND_IN_SET(DAYOFWEEK(CURDATE() - INTERVAL d.n DAY), p.days) = 0 THEN CRC32(CONCAT(p.habit_id, d.n)) % 100 < 12
    ELSE CRC32(CONCAT(p.habit_id, d.n)) % 100 < p.pct
  END;

-- ------------------------------------------------------ break relapses
-- Smoking: often in the first months, then rarer; clean for the last 27 days.
INSERT INTO habit_logs (id, habit_id, date, created_at)
  SELECT UUID(), 'de000000-0000-4000-8000-000000000111', CURDATE() - INTERVAL d.n DAY, TIMESTAMP(CURDATE() - INTERVAL d.n DAY, '21:00:00')
  FROM demo_days d
  WHERE (d.n BETWEEN 120 AND 300 AND CRC32(CONCAT('smoke', d.n)) % 100 < 14)
     OR d.n IN (104, 88, 61, 47, 27);

-- Scrolling after midnight: about once a week; the last one three days ago.
INSERT INTO habit_logs (id, habit_id, date, created_at)
  SELECT UUID(), 'de000000-0000-4000-8000-000000000112', CURDATE() - INTERVAL d.n DAY, TIMESTAMP(CURDATE() - INTERVAL d.n DAY, '23:50:00')
  FROM demo_days d
  WHERE (d.n BETWEEN 5 AND 120 AND CRC32(CONCAT('phone', d.n)) % 100 < 15)
     OR d.n = 3;

-- Coffee after 3 pm: no relapse since the start.

-- ---------------------------------------------------------------- goals
-- Progress is the linked habit's current streak against target_days.
INSERT INTO goals (id, user_id, habit_id, title, target_days, notes, archived_at, created_at, updated_at) VALUES
  ('de000000-0000-4000-8000-000000000201', @u, 'de000000-0000-4000-8000-000000000101', 'Hydrated for 30 days',          30,   'A bottle on the desk, refilled at every meeting.', NULL, CURDATE() - INTERVAL 40 DAY + INTERVAL 9 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000202', @u, 'de000000-0000-4000-8000-000000000102', 'Read every day for 3 weeks',    21,   'Twenty pages before opening the phone.',           NULL, CURDATE() - INTERVAL 14 DAY + INTERVAL 9 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000203', @u, 'de000000-0000-4000-8000-000000000103', 'Run two weeks without a gap',   14,   NULL,                                               NULL, CURDATE() - INTERVAL 30 DAY + INTERVAL 9 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000204', @u, 'de000000-0000-4000-8000-000000000104', 'Make meditation stick',         66,   'About 66 days until a habit runs on its own.',     NULL, CURDATE() - INTERVAL 45 DAY + INTERVAL 9 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000205', @u, 'de000000-0000-4000-8000-000000000105', 'Journal for a month',           30,   NULL,                                               NULL, CURDATE() - INTERVAL 20 DAY + INTERVAL 9 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000206', @u, 'de000000-0000-4000-8000-000000000111', '30 days smoke-free',            30,   'Chewing gum in every bag.',                        NULL, CURDATE() - INTERVAL 27 DAY + INTERVAL 9 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000207', @u, 'de000000-0000-4000-8000-000000000111', 'Quit smoking for 90 days',      90,   NULL,                                               NULL, CURDATE() - INTERVAL 27 DAY + INTERVAL 9 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000208', @u, 'de000000-0000-4000-8000-000000000112', 'A week without late scrolling', 7,    'Phone charges in the kitchen.',                    NULL, CURDATE() - INTERVAL 10 DAY + INTERVAL 9 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000209', @u, 'de000000-0000-4000-8000-000000000113', 'Sleep without late caffeine',   NULL, 'Open-ended: tea after lunch instead.',             NULL, CURDATE() - INTERVAL 45 DAY + INTERVAL 9 HOUR, NOW(3)),
  ('de000000-0000-4000-8000-000000000210', @u, 'de000000-0000-4000-8000-000000000121', 'Yoga three evenings a week',    12,   NULL, NOW(3) - INTERVAL 40 DAY, CURDATE() - INTERVAL 180 DAY + INTERVAL 9 HOUR, NOW(3) - INTERVAL 40 DAY);

DROP TEMPORARY TABLE demo_plan;
DROP TEMPORARY TABLE demo_days;

COMMIT;
