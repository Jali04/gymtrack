-- =============================================
-- GYMTRACK / DSCPLN — Database Schema
-- Place in Supabase SQL Editor to set up tables.
-- =============================================

-- Enable UUID extension if not already active
create extension if not exists "uuid-ossp";

-- 1. PROFILES Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  subscription_tier text not null default 'free',
  active_program_id text,
  week_status jsonb not null default '{"weekKey": 0, "mode": "normal"}'::jsonb,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.profiles enable row level security;

create policy "Users can manage their own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. EXERCISES Table
create table public.exercises (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  category text not null,
  notes text,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.exercises enable row level security;

create policy "Users can manage their own exercises" on public.exercises
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. WORKOUTS Table
create table public.workouts (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  start_time bigint not null,
  end_time bigint,
  date bigint not null,
  exercises jsonb not null, -- Array of exercises inside workout: [{ exId, sets: [...] }]
  notes text,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.workouts enable row level security;

create policy "Users can manage their own workouts" on public.workouts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. TEMPLATES Table
create table public.templates (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null,
  exercise_ids jsonb not null, -- Array of exercise IDs
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.templates enable row level security;

create policy "Users can manage their own templates" on public.templates
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. PROGRAMS Table
create table public.programs (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  schedule jsonb not null, -- JSON object mapping day-of-week strings to template IDs
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.programs enable row level security;

create policy "Users can manage their own programs" on public.programs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. MEASUREMENTS Table
create table public.measurements (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  date bigint not null,
  weight numeric not null,
  bf numeric,
  note text,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.measurements enable row level security;

create policy "Users can manage their own measurements" on public.measurements
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. PROGRESS_PICS Table
create table public.progress_pics (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  date bigint not null,
  data_url text not null, -- Base64 data string of the image
  note text,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.progress_pics enable row level security;

create policy "Users can manage their own progress pics" on public.progress_pics
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8. SUPPLEMENTS Table
create table public.supplements (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  form text,
  time text,
  dosage text,
  unit text,
  frequency text,
  weekdays jsonb,
  supply numeric,
  active boolean not null default true,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.supplements enable row level security;

create policy "Users can manage their own supplements" on public.supplements
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 9. SUPPLEMENT_LOG Table
create table public.supplement_log (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  supp_id text not null,
  date text not null, -- Format "YYYY-MM-DD"
  taken boolean not null default true,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.supplement_log enable row level security;

create policy "Users can manage their own supplement logs" on public.supplement_log
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 10. ACHIEVEMENTS Table
create table public.achievements (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  unlocked_at bigint not null,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.achievements enable row level security;

create policy "Users can manage their own achievements" on public.achievements
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 11. AI_CHATS Table
create table public.ai_chats (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  history jsonb not null, -- Array of chat messages [{role, text, time}]
  created bigint not null,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.ai_chats enable row level security;

create policy "Users can manage their own ai chats" on public.ai_chats
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- =============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, subscription_tier)
  values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
