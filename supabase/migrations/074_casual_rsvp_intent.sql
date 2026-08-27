-- Replaces the "[going]/[maybe]/[not_going] Name" bracket-prefix hack that
-- casualRSVP (src/app/actions/rsvp.ts) used to store Going/Maybe/Can't-Go
-- intent inside attendee_name, to avoid a migration. That hack was never
-- parsed anywhere it was read (public event page's rsvp count, the two
-- creator dashboard counts, the attendee list) — every casual RSVP,
-- including "Can't go", was counted as an attendee. This column makes
-- intent a real, queryable field and the backfill below un-prefixes any
-- rows already written under the old scheme.
--
-- NULL means "not a casual RSVP" (a normal ticketed/paid booking).

ALTER TABLE public.rsvps
  ADD COLUMN casual_intent text CHECK (casual_intent IN ('going', 'maybe', 'not_going'));

UPDATE public.rsvps
SET casual_intent = 'going', attendee_name = trim(substring(attendee_name FROM 9))
WHERE attendee_name LIKE '[going] %';

UPDATE public.rsvps
SET casual_intent = 'maybe', attendee_name = trim(substring(attendee_name FROM 9))
WHERE attendee_name LIKE '[maybe] %';

UPDATE public.rsvps
SET casual_intent = 'not_going', attendee_name = trim(substring(attendee_name FROM 13))
WHERE attendee_name LIKE '[not_going] %';
