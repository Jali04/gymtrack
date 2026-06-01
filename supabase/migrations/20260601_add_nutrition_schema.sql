-- =============================================
-- GYMTRACK / DSCPLN — Nutrition Schema Migration
-- =============================================

-- 1. NUTRITION_GOALS Table
create table if not exists public.nutrition_goals (
  user_id uuid references auth.users on delete cascade primary key,
  calories integer not null default 2000,
  protein integer not null default 150,
  carbs integer not null default 200,
  fat integer not null default 70,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.nutrition_goals enable row level security;

create policy "Users can manage their own nutrition goals" on public.nutrition_goals
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. NUTRITION_LOGS Table
create table if not exists public.nutrition_logs (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  date text not null, -- Format "YYYY-MM-DD"
  time_of_day text not null, -- "breakfast", "lunch", "dinner", "snack"
  name text not null,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  grams numeric not null,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.nutrition_logs enable row level security;

create policy "Users can manage their own nutrition logs" on public.nutrition_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. FOOD_LIBRARY Table
create table if not exists public.food_library (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  serving_size numeric not null default 100,
  is_custom boolean not null default true,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.food_library enable row level security;

create policy "Users can manage their own food library items" on public.food_library
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
