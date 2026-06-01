-- =============================================
-- GYMTRACK / DSCPLN — Add logged_amount & logged_unit to nutrition_logs
-- =============================================

alter table public.nutrition_logs
  add column if not exists logged_amount numeric,
  add column if not exists logged_unit text default 'g';
