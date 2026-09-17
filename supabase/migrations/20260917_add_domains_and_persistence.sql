-- =============================================
-- GYMTRACK / DSCPLN — Abteilungen (Gym / Mobility / Ernährung / Progress)
--
-- Phase 0: schließt die Persistenz-Lücken, in denen Nutzerdaten bisher nur im
--          localStorage lagen und beim Gerätewechsel verloren gingen.
-- Phase 1: führt `domain` als gemeinsames Rückgrat für Gym und Mobility ein.
--
-- Alle Statements sind idempotent (if not exists / if exists), damit das Script
-- gefahrlos mehrfach im SQL-Editor laufen kann.
-- =============================================

-- ---------------------------------------------
-- PHASE 1 — domain: ein Modell, zwei Abteilungen
--
-- 'gym'      … Krafttraining, Cardio, alles was in die Gym-Abteilung gehört
-- 'mobility' … Dehnen, Mobility-Flows, Warmups
-- 'mixed'    … nur für templates/workouts: enthält Blöcke beider Domains
--
-- Default 'gym' ist bewusst gewählt: bestehende Zeilen und ältere Clients, die
-- die Spalte nicht kennen, verhalten sich exakt wie bisher.
-- ---------------------------------------------
alter table public.exercises add column if not exists domain text not null default 'gym';
alter table public.templates add column if not exists domain text not null default 'gym';
alter table public.workouts  add column if not exists domain text not null default 'gym';

-- Bestehende Dehn-Übungen wandern in die Mobility-Abteilung. Historische
-- Workouts behalten ihre Sätze unverändert — nur die Zuordnung ändert sich.
update public.exercises
   set domain = 'mobility'
 where domain = 'gym'
   and category in ('Dehnen', 'Mobility', 'Stretching');

-- Abfragen filtern künftig fast immer nach Abteilung.
create index if not exists exercises_user_domain_idx on public.exercises (user_id, domain);
create index if not exists templates_user_domain_idx on public.templates (user_id, domain);
create index if not exists workouts_user_domain_idx  on public.workouts  (user_id, domain);

-- ---------------------------------------------
-- PHASE 0a — MEAL_PLANS
--
-- Ersetzt das rein lokale `db.mealPlanText`. Als eigene Tabelle statt als
-- Spalte, damit die Ernährungs-Abteilung mehrere benannte Pläne halten kann.
-- ---------------------------------------------
create table if not exists public.meal_plans (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null default 'Mein Plan',
  content text not null default '',
  active boolean not null default false,
  sort_order integer not null default 0,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  primary key (id, user_id)
);

alter table public.meal_plans enable row level security;

drop policy if exists "Users can manage their own meal plans" on public.meal_plans;
create policy "Users can manage their own meal plans" on public.meal_plans
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------
-- PHASE 0b — laufende Session auf dem Profil
--
-- Bisher lag `db.currentWorkout` nur lokal: Gerätewechsel mitten im Training
-- hieß Session weg. Als jsonb am Profil, weil es pro Nutzer genau eine gibt.
-- current_workout_at trägt den Zeitstempel des letzten Schreibens, damit der
-- Client eine veraltete Session erkennen und verwerfen kann.
-- ---------------------------------------------
alter table public.profiles add column if not exists current_workout jsonb;
alter table public.profiles add column if not exists current_workout_at bigint;
