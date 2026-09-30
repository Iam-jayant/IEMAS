-- ============================================================================
-- MIGRATION 002: Add Multispan Line Power columns + Fix RLS
-- IEMAS - Industrial Energy Monitoring & Analytics System
-- Date: 2026-09-30
-- Description:
--   1. Adds line1_power, line2_power, line3_power columns to meter_readings
--   2. Ensures the meter_readings table has phase-wise voltage/current columns
--      (these already exist if table was created via SQLAlchemy ORM)
--   3. Fixes RLS policies so the backend postgres connection can read/write
-- ============================================================================

-- ─── Step 1: Add new Multispan line-power columns ──────────────────────────
-- These are nullable with default 0 so existing Schneider data is untouched.

ALTER TABLE meter_readings
  ADD COLUMN IF NOT EXISTS line1_power REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line2_power REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line3_power REAL DEFAULT 0;

COMMENT ON COLUMN meter_readings.line1_power IS 'Line 1 individual power in kW (Multispan EM10-M1)';
COMMENT ON COLUMN meter_readings.line2_power IS 'Line 2 individual power in kW (Multispan EM10-M1)';
COMMENT ON COLUMN meter_readings.line3_power IS 'Line 3 individual power in kW (Multispan EM10-M1)';


-- ─── Step 2: Ensure phase-wise columns exist ───────────────────────────────
-- The ORM already creates these, but if the table was created from the old
-- schema.sql (which had single `voltage` / `current` columns), we need them.

-- Currents (phase-wise)
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS current_r REAL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS current_y REAL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS current_b REAL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS current_avg REAL DEFAULT 0;

-- Voltages Line-to-Line
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS voltage_ry REAL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS voltage_yb REAL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS voltage_br REAL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS voltage_ll_avg REAL DEFAULT 0;

-- Voltages Line-to-Neutral
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS voltage_rn REAL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS voltage_yn REAL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS voltage_bn REAL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS voltage_ln_avg REAL DEFAULT 0;


-- ─── Step 3: Fix RLS Policies ──────────────────────────────────────────────
-- The backend connects via Supabase pooler as the `postgres` role.
-- We need policies that allow this role (or just open for the service).

-- Drop old restrictive policies if they exist (safe: IF EXISTS)
DROP POLICY IF EXISTS "Allow authenticated users to read meters" ON meters;
DROP POLICY IF EXISTS "Allow authenticated users to manage meters" ON meters;
DROP POLICY IF EXISTS "Allow authenticated users to read meter_readings" ON meter_readings;
DROP POLICY IF EXISTS "Allow service role to insert meter_readings" ON meter_readings;
DROP POLICY IF EXISTS "Allow authenticated users to read thresholds" ON thresholds;
DROP POLICY IF EXISTS "Allow authenticated users to manage thresholds" ON thresholds;
DROP POLICY IF EXISTS "Allow authenticated users to read alerts" ON alerts;
DROP POLICY IF EXISTS "Allow authenticated users to update alerts" ON alerts;
DROP POLICY IF EXISTS "Allow service role to insert alerts" ON alerts;

-- ─── meters ────────────────────────────────────────────────────────────────
CREATE POLICY "meters_select_all" ON meters FOR SELECT USING (true);
CREATE POLICY "meters_insert_all" ON meters FOR INSERT WITH CHECK (true);
CREATE POLICY "meters_update_all" ON meters FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "meters_delete_all" ON meters FOR DELETE USING (true);

-- ─── meter_readings ────────────────────────────────────────────────────────
CREATE POLICY "meter_readings_select_all" ON meter_readings FOR SELECT USING (true);
CREATE POLICY "meter_readings_insert_all" ON meter_readings FOR INSERT WITH CHECK (true);
CREATE POLICY "meter_readings_update_all" ON meter_readings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "meter_readings_delete_all" ON meter_readings FOR DELETE USING (true);

-- ─── thresholds ────────────────────────────────────────────────────────────
CREATE POLICY "thresholds_select_all" ON thresholds FOR SELECT USING (true);
CREATE POLICY "thresholds_insert_all" ON thresholds FOR INSERT WITH CHECK (true);
CREATE POLICY "thresholds_update_all" ON thresholds FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "thresholds_delete_all" ON thresholds FOR DELETE USING (true);

-- ─── alerts ────────────────────────────────────────────────────────────────
CREATE POLICY "alerts_select_all" ON alerts FOR SELECT USING (true);
CREATE POLICY "alerts_insert_all" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "alerts_update_all" ON alerts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "alerts_delete_all" ON alerts FOR DELETE USING (true);


-- ─── Step 4: Refresh the latest_meter_readings view ────────────────────────
-- The view needs to include the new columns automatically via `meter_readings.*`
CREATE OR REPLACE VIEW latest_meter_readings AS
SELECT DISTINCT ON (meter_id)
    meter_readings.*,
    meters.name as meter_name,
    meters.location as meter_location,
    CASE
        WHEN meter_readings.timestamp > NOW() - INTERVAL '5 minutes' THEN 'online'
        ELSE 'offline'
    END as status
FROM meter_readings
JOIN meters ON meter_readings.meter_id = meters.meter_id
ORDER BY meter_id, timestamp DESC;

COMMENT ON VIEW latest_meter_readings IS 'Latest reading for each meter with online/offline status (includes line power columns)';
