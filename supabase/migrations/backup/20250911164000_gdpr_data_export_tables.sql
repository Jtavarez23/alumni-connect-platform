-- ================================================================
-- ALUMNI CONNECT: GDPR DATA EXPORT TABLES
-- File: 20250911164000_gdpr_data_export_tables.sql
-- Purpose: Support tables for GDPR-compliant data export functionality
-- ================================================================

-- ================================================================
-- 1. DATA EXPORT JOBS TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS data_export_jobs (
    id text PRIMARY KEY, -- Custom export ID
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')) DEFAULT 'pending',
    format text NOT NULL CHECK (format IN ('json', 'csv', 'xml')) DEFAULT 'json',
    include_media boolean NOT NULL DEFAULT false,
    data_categories text[] NOT NULL DEFAULT '{}',
    file_size bigint,
    download_url text,
    error_message text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ================================================================
-- 2. DATA EXPORT AUDIT LOG
-- ================================================================

CREATE TABLE IF NOT EXISTS data_export_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    export_job_id text NOT NULL REFERENCES data_export_jobs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN (
        'export_requested', 'export_started', 'export_completed', 
        'export_failed', 'export_downloaded', 'export_expired'
    )),
    details jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    performed_at timestamptz DEFAULT now()
);

-- ================================================================
-- 3. GDPR CONSENT TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS gdpr_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type text NOT NULL CHECK (consent_type IN (
        'data_processing', 'marketing', 'analytics', 'yearbook_processing',
        'photo_recognition', 'data_sharing', 'third_party_integrations'
    )),
    consent_given boolean NOT NULL,
    consent_version text NOT NULL, -- Version of privacy policy/terms
    consent_method text NOT NULL CHECK (consent_method IN (
        'registration', 'explicit_opt_in', 'settings_change', 'import'
    )),
    consent_details jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    given_at timestamptz NOT NULL DEFAULT now(),
    withdrawn_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ================================================================
-- 4. DATA RETENTION POLICIES
-- ================================================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type text NOT NULL UNIQUE CHECK (data_type IN (
        'user_profiles', 'posts', 'comments', 'messages', 'activity_logs',
        'yearbook_data', 'business_listings', 'event_data', 'auth_logs',
        'session_data', 'export_jobs', 'audit_logs'
    )),
    retention_period_days integer NOT NULL,
    auto_delete boolean NOT NULL DEFAULT true,
    deletion_method text NOT NULL CHECK (deletion_method IN ('soft_delete', 'hard_delete', 'anonymize')),
    exceptions jsonb DEFAULT '{}', -- Special cases or exceptions
    last_cleanup_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (data_type, retention_period_days, deletion_method) VALUES
('user_profiles', 2555, 'soft_delete'), -- ~7 years after account deletion
('posts', 1825, 'soft_delete'), -- 5 years
('comments', 1825, 'soft_delete'), -- 5 years
('messages', 1095, 'hard_delete'), -- 3 years
('activity_logs', 365, 'hard_delete'), -- 1 year
('yearbook_data', -1, 'soft_delete'), -- Keep indefinitely (historical value)
('business_listings', 1095, 'soft_delete'), -- 3 years
('event_data', 1825, 'soft_delete'), -- 5 years
('auth_logs', 365, 'hard_delete'), -- 1 year
('session_data', 90, 'hard_delete'), -- 90 days
('export_jobs', 30, 'hard_delete'), -- 30 days
('audit_logs', 2555, 'hard_delete') -- 7 years (regulatory requirement)
ON CONFLICT (data_type) DO NOTHING;

-- ================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ================================================================

-- Data export jobs indexes
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_user_id ON data_export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_status ON data_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_expires_at ON data_export_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_requested_at ON data_export_jobs(requested_at);

-- Export audit indexes
CREATE INDEX IF NOT EXISTS idx_data_export_audit_export_job ON data_export_audit(export_job_id);
CREATE INDEX IF NOT EXISTS idx_data_export_audit_user_id ON data_export_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_audit_action ON data_export_audit(action);
CREATE INDEX IF NOT EXISTS idx_data_export_audit_performed_at ON data_export_audit(performed_at);

-- GDPR consents indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user_id ON gdpr_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_type ON gdpr_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_given_at ON gdpr_consents(given_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_active ON gdpr_consents(consent_given) WHERE withdrawn_at IS NULL;

-- ================================================================
-- 6. TRIGGERS FOR AUDIT LOGGING
-- ================================================================

-- Trigger for export job status changes
CREATE OR REPLACE FUNCTION log_export_job_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO data_export_audit (
            export_job_id,
            user_id,
            action,
            details,
            ip_address,
            user_agent
        ) VALUES (
            NEW.id,
            NEW.user_id,
            CASE 
                WHEN NEW.status = 'processing' THEN 'export_started'
                WHEN NEW.status = 'completed' THEN 'export_completed'
                WHEN NEW.status = 'failed' THEN 'export_failed'
                WHEN NEW.status = 'expired' THEN 'export_expired'
                ELSE 'export_status_changed'
            END,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'error_message', NEW.error_message
            ),
            COALESCE(current_setting('request.header.x-forwarded-for', true)::inet, '127.0.0.1'::inet),
            current_setting('request.header.user-agent', true)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply export job audit trigger
CREATE TRIGGER data_export_jobs_audit_trigger
    AFTER UPDATE ON data_export_jobs
    FOR EACH ROW EXECUTE FUNCTION log_export_job_changes();

-- Updated at triggers
CREATE TRIGGER data_export_jobs_updated_at
    BEFORE UPDATE ON data_export_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER gdpr_consents_updated_at
    BEFORE UPDATE ON gdpr_consents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER data_retention_policies_updated_at
    BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 7. GDPR COMPLIANCE FUNCTIONS
-- ================================================================

-- Function to record user consent
CREATE OR REPLACE FUNCTION record_gdpr_consent(
    user_uuid uuid,
    consent_type_val text,
    consent_given_val boolean,
    consent_version_val text,
    consent_method_val text DEFAULT 'explicit_opt_in',
    details jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
    consent_id uuid;
BEGIN
    -- Withdraw previous consent of same type if giving new consent
    IF consent_given_val THEN
        UPDATE gdpr_consents
        SET withdrawn_at = now(),
            updated_at = now()
        WHERE user_id = user_uuid
          AND consent_type = consent_type_val
          AND withdrawn_at IS NULL;
    END IF;
    
    -- Record new consent
    INSERT INTO gdpr_consents (
        user_id,
        consent_type,
        consent_given,
        consent_version,
        consent_method,
        consent_details,
        ip_address,
        user_agent
    ) VALUES (
        user_uuid,
        consent_type_val,
        consent_given_val,
        consent_version_val,
        consent_method_val,
        details,
        COALESCE(current_setting('request.header.x-forwarded-for', true)::inet, '127.0.0.1'::inet),
        current_setting('request.header.user-agent', true)
    ) RETURNING id INTO consent_id;
    
    RETURN consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current consents
CREATE OR REPLACE FUNCTION get_user_consents(user_uuid uuid)
RETURNS TABLE(
    consent_type text,
    consent_given boolean,
    consent_version text,
    given_at timestamptz,
    withdrawn_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (c.consent_type)
        c.consent_type,
        c.consent_given,
        c.consent_version,
        c.given_at,
        c.withdrawn_at
    FROM gdpr_consents c
    WHERE c.user_id = user_uuid
    ORDER BY c.consent_type, c.given_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired export jobs
CREATE OR REPLACE FUNCTION cleanup_expired_export_jobs()
RETURNS integer AS $$
DECLARE
    expired_count integer;
BEGIN
    -- Mark expired jobs
    UPDATE data_export_jobs
    SET status = 'expired',
        updated_at = now()
    WHERE expires_at < now()
      AND status IN ('pending', 'processing', 'completed');
    
    -- Delete old expired jobs and their audit records
    DELETE FROM data_export_jobs
    WHERE status = 'expired'
      AND expires_at < now() - interval '30 days';
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply data retention policies
CREATE OR REPLACE FUNCTION apply_data_retention_policies()
RETURNS TABLE(data_type text, deleted_count integer) AS $$
DECLARE
    policy_record RECORD;
    deletion_count integer;
    cutoff_date timestamptz;
BEGIN
    FOR policy_record IN 
        SELECT * FROM data_retention_policies 
        WHERE auto_delete = true AND retention_period_days > 0
    LOOP
        cutoff_date := now() - (policy_record.retention_period_days || ' days')::interval;
        deletion_count := 0;
        
        -- Apply retention policy based on data type
        CASE policy_record.data_type
            WHEN 'activity_logs' THEN
                DELETE FROM activity_feed WHERE created_at < cutoff_date;
                GET DIAGNOSTICS deletion_count = ROW_COUNT;
                
            WHEN 'session_data' THEN
                DELETE FROM user_sessions WHERE created_at < cutoff_date;
                GET DIAGNOSTICS deletion_count = ROW_COUNT;
                
            WHEN 'export_jobs' THEN
                DELETE FROM data_export_jobs WHERE created_at < cutoff_date;
                GET DIAGNOSTICS deletion_count = ROW_COUNT;
                
            WHEN 'auth_logs' THEN
                DELETE FROM auth_audit_log WHERE occurred_at < cutoff_date;
                GET DIAGNOSTICS deletion_count = ROW_COUNT;
                
            ELSE
                -- Skip unknown data types
                CONTINUE;
        END CASE;
        
        -- Update last cleanup timestamp
        UPDATE data_retention_policies
        SET last_cleanup_at = now(),
            updated_at = now()
        WHERE id = policy_record.id;
        
        -- Return result
        RETURN QUERY SELECT policy_record.data_type, deletion_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on GDPR tables
ALTER TABLE data_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Data export jobs policies
CREATE POLICY "Users can only see their own export jobs" ON data_export_jobs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all export jobs" ON data_export_jobs
    FOR ALL USING (current_setting('role') = 'service_role');

-- Export audit policies
CREATE POLICY "Users can see audit logs for their exports" ON data_export_audit
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage export audit logs" ON data_export_audit
    FOR ALL USING (current_setting('role') = 'service_role');

-- GDPR consents policies
CREATE POLICY "Users can see their own consents" ON gdpr_consents
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage consents" ON gdpr_consents
    FOR ALL USING (current_setting('role') = 'service_role');

-- Data retention policies (read-only for users, full access for service)
CREATE POLICY "Users can read retention policies" ON data_retention_policies
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage retention policies" ON data_retention_policies
    FOR ALL USING (current_setting('role') = 'service_role');

-- ================================================================
-- 9. VALIDATION
-- ================================================================

-- Test GDPR functionality
DO $$
DECLARE
    test_user_id uuid;
    consent_id uuid;
BEGIN
    -- Test consent recording (if there are any users)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        consent_id := record_gdpr_consent(
            test_user_id,
            'data_processing',
            true,
            'v1.0',
            'registration'
        );
        
        RAISE NOTICE 'GDPR consent recorded: %', consent_id;
    END IF;
    
    RAISE NOTICE 'GDPR Data Export Tables Migration: COMPLETED SUCCESSFULLY';
END $$;