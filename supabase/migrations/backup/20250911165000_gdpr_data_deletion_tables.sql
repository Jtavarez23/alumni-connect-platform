-- ================================================================
-- ALUMNI CONNECT: GDPR DATA DELETION TABLES
-- File: 20250911165000_gdpr_data_deletion_tables.sql
-- Purpose: Support tables for GDPR-compliant data deletion functionality
-- ================================================================

-- ================================================================
-- 1. DATA DELETION JOBS TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS data_deletion_jobs (
    id text PRIMARY KEY, -- Custom deletion ID
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN (
        'pending_confirmation', 'confirmed', 'processing', 
        'completed', 'cancelled', 'failed'
    )) DEFAULT 'pending_confirmation',
    deletion_type text NOT NULL CHECK (deletion_type IN ('account', 'partial')) DEFAULT 'account',
    data_categories text[] NOT NULL DEFAULT '{}',
    confirmation_code text NOT NULL,
    reason text,
    deleted_records jsonb, -- Track what was actually deleted
    error_message text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    expires_at timestamptz NOT NULL, -- Expiration for confirmation
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ================================================================
-- 2. DATA DELETION AUDIT LOG
-- ================================================================

CREATE TABLE IF NOT EXISTS data_deletion_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deletion_job_id text NOT NULL REFERENCES data_deletion_jobs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN (
        'deletion_requested', 'deletion_confirmed', 'deletion_started',
        'deletion_completed', 'deletion_failed', 'deletion_cancelled',
        'category_deleted', 'records_deleted'
    )),
    category text, -- Specific data category if applicable
    records_affected integer,
    details jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    performed_at timestamptz DEFAULT now()
);

-- ================================================================
-- 3. SOFT DELETE TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS soft_delete_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id text NOT NULL, -- Can be UUID or other ID type
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    deletion_job_id text REFERENCES data_deletion_jobs(id) ON DELETE SET NULL,
    original_data jsonb, -- Backup of original record
    deleted_at timestamptz NOT NULL DEFAULT now(),
    permanent_deletion_at timestamptz, -- When it will be permanently deleted
    restored_at timestamptz, -- If record was restored
    created_at timestamptz DEFAULT now()
);

-- ================================================================
-- 4. ANONYMIZATION TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS anonymization_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    deletion_job_id text REFERENCES data_deletion_jobs(id) ON DELETE SET NULL,
    anonymized_fields text[] NOT NULL DEFAULT '{}',
    anonymization_method text NOT NULL CHECK (anonymization_method IN (
        'replacement', 'hashing', 'truncation', 'generalization'
    )),
    anonymized_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- ================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ================================================================

-- Data deletion jobs indexes
CREATE INDEX IF NOT EXISTS idx_data_deletion_jobs_user_id ON data_deletion_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_jobs_status ON data_deletion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_jobs_expires_at ON data_deletion_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_data_deletion_jobs_requested_at ON data_deletion_jobs(requested_at);

-- Deletion audit indexes
CREATE INDEX IF NOT EXISTS idx_data_deletion_audit_job_id ON data_deletion_audit(deletion_job_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_audit_user_id ON data_deletion_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_audit_action ON data_deletion_audit(action);
CREATE INDEX IF NOT EXISTS idx_data_deletion_audit_performed_at ON data_deletion_audit(performed_at);

-- Soft delete records indexes
CREATE INDEX IF NOT EXISTS idx_soft_delete_records_table_record ON soft_delete_records(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_soft_delete_records_user_id ON soft_delete_records(user_id);
CREATE INDEX IF NOT EXISTS idx_soft_delete_records_deletion_job ON soft_delete_records(deletion_job_id);
CREATE INDEX IF NOT EXISTS idx_soft_delete_records_permanent_deletion ON soft_delete_records(permanent_deletion_at) WHERE permanent_deletion_at IS NOT NULL;

-- Anonymization records indexes
CREATE INDEX IF NOT EXISTS idx_anonymization_records_table_record ON anonymization_records(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_anonymization_records_user_id ON anonymization_records(user_id);
CREATE INDEX IF NOT EXISTS idx_anonymization_records_deletion_job ON anonymization_records(deletion_job_id);

-- ================================================================
-- 6. TRIGGERS FOR AUDIT LOGGING
-- ================================================================

-- Trigger for deletion job status changes
CREATE OR REPLACE FUNCTION log_deletion_job_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO data_deletion_audit (
        deletion_job_id,
        user_id,
        action,
        details,
        ip_address,
        user_agent
    ) VALUES (
        NEW.id,
        NEW.user_id,
        CASE 
            WHEN OLD.status IS DISTINCT FROM NEW.status THEN
                CASE NEW.status
                    WHEN 'confirmed' THEN 'deletion_confirmed'
                    WHEN 'processing' THEN 'deletion_started'
                    WHEN 'completed' THEN 'deletion_completed'
                    WHEN 'failed' THEN 'deletion_failed'
                    WHEN 'cancelled' THEN 'deletion_cancelled'
                    ELSE 'deletion_status_changed'
                END
            ELSE 'deletion_updated'
        END,
        jsonb_build_object(
            'old_status', OLD.status,
            'new_status', NEW.status,
            'deletion_type', NEW.deletion_type,
            'data_categories', NEW.data_categories,
            'error_message', NEW.error_message,
            'deleted_records', NEW.deleted_records
        ),
        COALESCE(current_setting('request.header.x-forwarded-for', true)::inet, '127.0.0.1'::inet),
        current_setting('request.header.user-agent', true)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply deletion job audit trigger
CREATE TRIGGER data_deletion_jobs_audit_trigger
    AFTER UPDATE ON data_deletion_jobs
    FOR EACH ROW EXECUTE FUNCTION log_deletion_job_changes();

-- Updated at triggers
CREATE TRIGGER data_deletion_jobs_updated_at
    BEFORE UPDATE ON data_deletion_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 7. DELETION UTILITY FUNCTIONS
-- ================================================================

-- Function to soft delete a record
CREATE OR REPLACE FUNCTION soft_delete_record(
    table_name_val text,
    record_id_val text,
    user_id_val uuid,
    deletion_job_id_val text DEFAULT NULL,
    backup_data jsonb DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    soft_delete_id uuid;
    permanent_deletion_date timestamptz;
BEGIN
    -- Calculate permanent deletion date (90 days from now)
    permanent_deletion_date := now() + interval '90 days';
    
    -- Insert soft delete record
    INSERT INTO soft_delete_records (
        table_name,
        record_id,
        user_id,
        deletion_job_id,
        original_data,
        permanent_deletion_at
    ) VALUES (
        table_name_val,
        record_id_val,
        user_id_val,
        deletion_job_id_val,
        backup_data,
        permanent_deletion_date
    ) RETURNING id INTO soft_delete_id;
    
    RETURN soft_delete_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to anonymize a record
CREATE OR REPLACE FUNCTION anonymize_record(
    table_name_val text,
    record_id_val text,
    user_id_val uuid,
    deletion_job_id_val text DEFAULT NULL,
    fields_to_anonymize text[] DEFAULT '{}',
    anonymization_method_val text DEFAULT 'replacement'
) RETURNS uuid AS $$
DECLARE
    anonymization_id uuid;
BEGIN
    -- Insert anonymization record
    INSERT INTO anonymization_records (
        table_name,
        record_id,
        user_id,
        deletion_job_id,
        anonymized_fields,
        anonymization_method
    ) VALUES (
        table_name_val,
        record_id_val,
        user_id_val,
        deletion_job_id_val,
        fields_to_anonymize,
        anonymization_method_val
    ) RETURNING id INTO anonymization_id;
    
    RETURN anonymization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete soft-deleted records
CREATE OR REPLACE FUNCTION permanent_delete_expired_records()
RETURNS integer AS $$
DECLARE
    deleted_count integer := 0;
    record_to_delete RECORD;
    sql_command text;
BEGIN
    -- Find records ready for permanent deletion
    FOR record_to_delete IN 
        SELECT * FROM soft_delete_records 
        WHERE permanent_deletion_at < now() 
          AND restored_at IS NULL
    LOOP
        BEGIN
            -- Build dynamic SQL for permanent deletion
            sql_command := format('DELETE FROM %I WHERE id = %L', 
                record_to_delete.table_name, 
                record_to_delete.record_id
            );
            
            -- Execute deletion
            EXECUTE sql_command;
            
            -- Remove from soft delete tracking
            DELETE FROM soft_delete_records 
            WHERE id = record_to_delete.id;
            
            deleted_count := deleted_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue with other records
            RAISE WARNING 'Failed to permanently delete record % from %: %', 
                record_to_delete.record_id, 
                record_to_delete.table_name, 
                SQLERRM;
        END;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired deletion jobs
CREATE OR REPLACE FUNCTION cleanup_expired_deletion_jobs()
RETURNS integer AS $$
DECLARE
    expired_count integer;
BEGIN
    -- Mark expired jobs as cancelled
    UPDATE data_deletion_jobs
    SET status = 'cancelled',
        updated_at = now()
    WHERE expires_at < now()
      AND status = 'pending_confirmation';
    
    -- Delete old completed/cancelled/failed jobs (keep for 1 year)
    DELETE FROM data_deletion_jobs
    WHERE status IN ('completed', 'cancelled', 'failed')
      AND completed_at < now() - interval '1 year';
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get deletion statistics for a user
CREATE OR REPLACE FUNCTION get_user_deletion_stats(user_uuid uuid)
RETURNS TABLE(
    total_deletion_requests integer,
    pending_requests integer,
    completed_requests integer,
    soft_deleted_records integer,
    anonymized_records integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::integer FROM data_deletion_jobs WHERE user_id = user_uuid),
        (SELECT COUNT(*)::integer FROM data_deletion_jobs WHERE user_id = user_uuid AND status IN ('pending_confirmation', 'confirmed', 'processing')),
        (SELECT COUNT(*)::integer FROM data_deletion_jobs WHERE user_id = user_uuid AND status = 'completed'),
        (SELECT COUNT(*)::integer FROM soft_delete_records WHERE user_id = user_uuid AND restored_at IS NULL),
        (SELECT COUNT(*)::integer FROM anonymization_records WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on deletion tables
ALTER TABLE data_deletion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE soft_delete_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymization_records ENABLE ROW LEVEL SECURITY;

-- Data deletion jobs policies
CREATE POLICY "Users can only see their own deletion jobs" ON data_deletion_jobs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all deletion jobs" ON data_deletion_jobs
    FOR ALL USING (current_setting('role') = 'service_role');

-- Deletion audit policies
CREATE POLICY "Users can see audit logs for their deletions" ON data_deletion_audit
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage deletion audit logs" ON data_deletion_audit
    FOR ALL USING (current_setting('role') = 'service_role');

-- Soft delete records policies
CREATE POLICY "Users can see their own soft delete records" ON soft_delete_records
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage soft delete records" ON soft_delete_records
    FOR ALL USING (current_setting('role') = 'service_role');

-- Anonymization records policies
CREATE POLICY "Users can see their own anonymization records" ON anonymization_records
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage anonymization records" ON anonymization_records
    FOR ALL USING (current_setting('role') = 'service_role');

-- ================================================================
-- 9. VALIDATION
-- ================================================================

-- Test deletion functionality
DO $$
DECLARE
    test_user_id uuid;
    soft_delete_id uuid;
    anonymization_id uuid;
    stats_result RECORD;
BEGIN
    -- Test soft delete function (if there are any users)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        soft_delete_id := soft_delete_record(
            'test_table',
            'test_record_id',
            test_user_id,
            NULL,
            '{"test": "data"}'::jsonb
        );
        
        anonymization_id := anonymize_record(
            'test_table',
            'test_record_id2',
            test_user_id,
            NULL,
            ARRAY['name', 'email'],
            'replacement'
        );
        
        SELECT * INTO stats_result FROM get_user_deletion_stats(test_user_id);
        
        RAISE NOTICE 'Soft delete ID: %', soft_delete_id;
        RAISE NOTICE 'Anonymization ID: %', anonymization_id;
        RAISE NOTICE 'User deletion stats: %', stats_result;
    END IF;
    
    RAISE NOTICE 'GDPR Data Deletion Tables Migration: COMPLETED SUCCESSFULLY';
END $$;