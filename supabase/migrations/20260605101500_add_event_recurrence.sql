ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_weekday integer,
  ADD COLUMN IF NOT EXISTS recurrence_time time;

ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS occurrence_starts_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_recurrence_type_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_recurrence_type_check
      CHECK (recurrence_type IN ('none', 'weekly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_recurrence_weekday_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_recurrence_weekday_check
      CHECK (recurrence_weekday IS NULL OR recurrence_weekday BETWEEN 0 AND 6);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_recurrence_weekly_fields_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_recurrence_weekly_fields_check
      CHECK (
        recurrence_type <> 'weekly'
        OR (recurrence_weekday IS NOT NULL AND recurrence_time IS NOT NULL)
      );
  END IF;
END $$;
