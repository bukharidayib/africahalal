-- Auto-escalate supervisor NCR to formal NCN
CREATE OR REPLACE FUNCTION public.auto_escalate_supervisor_ncr_to_ncn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _organization_id uuid;
  _application_id uuid;
  _ncn_number text;
  _existing_id uuid;
BEGIN
  IF NEW.status = 'escalated' AND (OLD.status IS NULL OR OLD.status != 'escalated') THEN
    SELECT organization_id INTO _organization_id
    FROM public.supervisor_sites
    WHERE id = NEW.site_id
    LIMIT 1;

    IF _organization_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT id INTO _application_id
    FROM public.certification_applications
    WHERE organization_id = _organization_id
      AND status NOT IN ('draft', 'rejected', 'approved')
    ORDER BY created_at DESC
    LIMIT 1;

    IF _application_id IS NULL THEN
      SELECT id INTO _application_id
      FROM public.certification_applications
      WHERE organization_id = _organization_id
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    IF _application_id IS NULL THEN
      RAISE LOG 'auto_escalate_supervisor_ncr_to_ncn: no application for org %', _organization_id;
      RETURN NEW;
    END IF;

    SELECT id INTO _existing_id
    FROM public.non_conformance_notices
    WHERE application_id = _application_id
      AND description LIKE '%[Auto-escalated from supervisor NCR ' || NEW.ncr_number || ']%'
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    _ncn_number := public.generate_ncn_number();

    INSERT INTO public.non_conformance_notices (
      ncn_number, application_id, category, description,
      severity, due_date, issued_by, status
    ) VALUES (
      _ncn_number,
      _application_id,
      NEW.category,
      NEW.description || E'\n\n[Auto-escalated from supervisor NCR ' || NEW.ncr_number || ']',
      CASE NEW.severity WHEN 'critical' THEN 'critical'::ncn_severity
                       WHEN 'major' THEN 'major'::ncn_severity
                       ELSE 'minor'::ncn_severity END,
      COALESCE(NEW.due_date, (CURRENT_DATE + INTERVAL '14 days')::date),
      NEW.raised_by,
      'open'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_escalate_supervisor_ncr ON public.supervisor_ncrs;
CREATE TRIGGER trg_auto_escalate_supervisor_ncr
AFTER UPDATE OF status ON public.supervisor_ncrs
FOR EACH ROW
EXECUTE FUNCTION public.auto_escalate_supervisor_ncr_to_ncn();

-- Auto-advance application status when last open NCN closes
CREATE OR REPLACE FUNCTION public.sync_application_on_ncn_closure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _open_count integer;
  _current_status application_status;
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status != 'closed') THEN
    SELECT COUNT(*) INTO _open_count
    FROM public.non_conformance_notices
    WHERE application_id = NEW.application_id
      AND status = 'open';

    IF _open_count = 0 THEN
      SELECT status INTO _current_status
      FROM public.certification_applications
      WHERE id = NEW.application_id;

      IF _current_status = 'under_review' THEN
        UPDATE public.certification_applications
        SET status = 'pending_decision',
            updated_at = now()
        WHERE id = NEW.application_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_application_on_ncn_closure ON public.non_conformance_notices;
CREATE TRIGGER trg_sync_application_on_ncn_closure
AFTER UPDATE OF status ON public.non_conformance_notices
FOR EACH ROW
EXECUTE FUNCTION public.sync_application_on_ncn_closure();