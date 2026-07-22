-- =============================================
-- GYMTRACK / DSCPLN — Persist local-only user data on the profile
--
-- customCategories (incl. their type, e.g. the new "isometric"), per-exercise
-- flags (bodyweight, …) and settings (unit, RIR, bar weight, plates, weekly
-- goal) previously lived only in localStorage and were lost on device change
-- or cache clear. Store them on the existing profiles row so they sync.
--
-- Security: no new table and no new policy — these columns inherit the
-- profiles table's existing row-level security (auth.uid() = id), so a user
-- can only ever read or write their own values.
-- =============================================

alter table public.profiles
  add column if not exists custom_categories jsonb not null default '{}'::jsonb,
  add column if not exists exercise_flags jsonb not null default '{}'::jsonb,
  add column if not exists settings jsonb not null default '{}'::jsonb;
