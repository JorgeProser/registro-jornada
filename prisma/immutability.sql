-- ============================================================
-- Immutability Enforcement (PostgreSQL)
-- Run AFTER prisma migrate dev
-- Prevents any UPDATE on original clockIn/clockOut columns.
-- Admin corrections use adminCorrectedClockIn/Out instead.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_time_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Original clock-in cannot change after creation
  IF OLD.clock_in IS DISTINCT FROM NEW.clock_in THEN
    RAISE EXCEPTION
      'Immutability violation: clock_in is read-only after creation (RD-ley 8/2019). Use admin_corrected_clock_in for corrections.';
  END IF;

  -- Original clock-out can only be SET once (null → value), never changed after set
  IF OLD.clock_out IS NOT NULL AND OLD.clock_out IS DISTINCT FROM NEW.clock_out THEN
    RAISE EXCEPTION
      'Immutability violation: clock_out cannot be modified after it is set (RD-ley 8/2019). Use admin_corrected_clock_out for corrections.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_time_log_immutability ON time_logs;
CREATE TRIGGER trg_time_log_immutability
  BEFORE UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_time_log_immutability();

-- ── Audit trail is strictly append-only ────────────────────
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit trail records are immutable (RD-ley 8/2019 compliance). No UPDATE or DELETE allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_trail;
CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE ON audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_trail;
CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- ── 4-year retention check (informational) ─────────────────
-- Run periodically to identify logs approaching retention limit
-- SELECT id, user_id, work_date, created_at
-- FROM time_logs
-- WHERE created_at < NOW() - INTERVAL '4 years'
-- ORDER BY created_at ASC;
