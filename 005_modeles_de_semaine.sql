-- Module P1 : modèles de semaine réutilisables.
-- Migration additive et idempotente : aucune table de planning existante n'est modifiée.

CREATE TABLE IF NOT EXISTS public.planning_week_templates (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(120) NOT NULL UNIQUE,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planning_week_template_shifts (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "templateId" integer NOT NULL REFERENCES public.planning_week_templates(id) ON DELETE CASCADE,
  "dayOffset" smallint NOT NULL CHECK ("dayOffset" BETWEEN 0 AND 6),
  "startsAt" varchar(5) NOT NULL CHECK ("startsAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  "endsAt" varchar(5) NOT NULL CHECK ("endsAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endsAt" > "startsAt"),
  position varchar(120) NOT NULL,
  "requiredStaff" integer NOT NULL DEFAULT 1 CHECK ("requiredStaff" BETWEEN 1 AND 20),
  note text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.planning_week_template_assignments (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "templateShiftId" integer NOT NULL REFERENCES public.planning_week_template_shifts(id) ON DELETE CASCADE,
  "staffMemberId" integer NOT NULL REFERENCES public.staff_members(id),
  "startsAt" varchar(5) NOT NULL CHECK ("startsAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  "endsAt" varchar(5) NOT NULL CHECK ("endsAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endsAt" > "startsAt"),
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  UNIQUE ("templateShiftId", "staffMemberId")
);

CREATE INDEX IF NOT EXISTS planning_week_template_shifts_template_id_idx
  ON public.planning_week_template_shifts ("templateId");

CREATE INDEX IF NOT EXISTS planning_week_template_assignments_shift_id_idx
  ON public.planning_week_template_assignments ("templateShiftId");

CREATE INDEX IF NOT EXISTS planning_week_template_assignments_staff_id_idx
  ON public.planning_week_template_assignments ("staffMemberId");
