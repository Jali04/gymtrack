-- =============================================
-- GYMTRACK / DSCPLN — Add template_id to workouts
-- Keeps the link to the template a workout was started from, so the app
-- doesn't fall back to "Freies Training" after a cloud sync round-trip.
-- =============================================

alter table public.workouts
  add column if not exists template_id text;
