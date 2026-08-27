-- Module : annulation sûre d’une duplication de semaine.
-- Migration additive : elle ajoute uniquement une trace de duplication et ne modifie aucune donnée existante.

CREATE TABLE IF NOT EXISTS public.planning_week_duplications (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "sourceWeekId" integer NOT NULL REFERENCES public.planning_weeks(id) ON DELETE CASCADE,
  "sourceWeekStart" varchar(10) NOT NULL,
  "targetWeekId" integer NOT NULL REFERENCES public.planning_weeks(id) ON DELETE CASCADE,
  "targetWeekStart" varchar(10) NOT NULL,
  "targetFingerprint" varchar(64) NOT NULL,
  "targetWeekCreated" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT planning_week_duplications_target_week_unique UNIQUE ("targetWeekId"),
  CONSTRAINT planning_week_duplications_distinct_weeks CHECK ("sourceWeekId" <> "targetWeekId")
);

CREATE INDEX IF NOT EXISTS planning_week_duplications_source_week_id_idx
  ON public.planning_week_duplications ("sourceWeekId");

CREATE INDEX IF NOT EXISTS planning_week_duplications_target_week_start_idx
  ON public.planning_week_duplications ("targetWeekStart");
