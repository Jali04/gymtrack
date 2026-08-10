-- =============================================
-- GYMTRACK / DSCPLN — Trainingstag am Workout festhalten
--
-- Fortschritt und der "letztes Mal"-Ghost-Text vergleichen pro Trainingstag,
-- also pro Vorlage, aus der ein Training gestartet wurde. Damit das ein
-- Gerätewechsel oder eine Neuinstallation überlebt, muss der Tag am Workout
-- selbst in der Cloud liegen:
--
--   template_id   — die Vorlage, aus der das Training gestartet wurde.
--                   Stand bisher nur im create-table von schema.sql, es gab
--                   nie eine Migration dafür. Projekte, die vor jenem Commit
--                   angelegt wurden, haben die Spalte nicht — und weil ein
--                   fehlendes Feld den ganzen Upsert-Batch scheitern lässt,
--                   synchronisieren dort ÜBERHAUPT KEINE Workouts (der Fehler
--                   landet nur in der Konsole). Deshalb hier nachgezogen.
--   template_name — Name der Vorlage zum Zeitpunkt des Trainings. Bleibt
--                   lesbar, wenn die Vorlage später gelöscht oder umbenannt
--                   wird, und dient als Rückfallebene für den Tagesabgleich,
--                   wenn die id verloren ging.
--
-- Security: keine neue Tabelle, keine neue Policy — die Spalten erben die
-- bestehende row-level security der workouts-Tabelle (auth.uid() = user_id).
-- =============================================

alter table public.workouts
  add column if not exists template_id text,
  add column if not exists template_name text;
