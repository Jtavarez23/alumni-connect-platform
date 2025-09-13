-- ================================================================
-- ALUMNI CONNECT: EMAIL/SMS VERIFICATION TABLES
-- File: 20250911161000_verification_tables.sql
-- Purpose: Support tables for email and SMS verification flows
-- ================================================================

-- ================================================================
-- 1. EMAIL VERIFICATION TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS email_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    code text NOT NULL,
    token text NOT NULL UNIQUE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_verified boolean NOT NULL DEFAULT false,
    attempts integer NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    verified_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ================================================================
-- 2. SMS VERIFICATION TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS sms_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone text NOT NULL,
    code text NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_verified boolean NOT NULL DEFAULT false,
    attempts integer NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    verified_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ================================================================
-- 3. VERIFICATION ATTEMPT LOGGING
-- ================================================================

CREATE TABLE IF NOT EXISTS verification_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_type text NOT NULL CHECK (verification_type IN ('email', 'sms')),
    identifier text NOT NULL, -- email or phone
    success boolean NOT NULL,
    ip_address inet,
    user_agent text,
    error_message text,
    attempted_at timestamptz DEFAULT now()
);

-- ================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ================================================================

-- Email verification indexes
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verifications_verified ON email_verifications(is_verified) WHERE is_verified = false;

-- SMS verification indexes
CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone ON sms_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_user_id ON sms_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_expires_at ON sms_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_verified ON sms_verifications(is_verified) WHERE is_verified = false;

-- Verification attempts indexes
CREATE INDEX IF NOT EXISTS idx_verification_attempts_type ON verification_attempts(verification_type);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_identifier ON verification_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_attempted_at ON verification_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_ip ON verification_attempts(ip_address);

-- ================================================================
-- 5. TRIGGERS FOR AUTOMATIC UPDATES
-- ================================================================

-- Updated at triggers
CREATE TRIGGER email_verifications_updated_at
    BEFORE UPDATE ON email_verifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sms_verifications_updated_at
    BEFORE UPDATE ON sms_verifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatic attempt logging trigger
CREATE OR REPLACE FUNCTION log_verification_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when verification is attempted (attempts column incremented)
    IF OLD.attempts IS DISTINCT FROM NEW.attempts AND NEW.attempts > OLD.attempts THEN
        INSERT INTO verification_attempts (
            verification_type,
            identifier,
            success,
            ip_address,
            user_agent,
            error_message
        ) VALUES (
            CASE 
                WHEN TG_TABLE_NAME = 'email_verifications' THEN 'email'
                WHEN TG_TABLE_NAME = 'sms_verifications' THEN 'sms'
            END,
            CASE 
                WHEN TG_TABLE_NAME = 'email_verifications' THEN NEW.email
                WHEN TG_TABLE_NAME = 'sms_verifications' THEN NEW.phone
            END,
            false, -- Attempt failed if we're incrementing attempts
            COALESCE(current_setting('request.header.x-forwarded-for', true)::inet, '127.0.0.1'::inet),
            current_setting('request.header.user-agent', true),
            'Too many attempts'
        );
    END IF;
    
    -- Log successful verification
    IF OLD.is_verified = false AND NEW.is_verified = true THEN
        INSERT INTO verification_attempts (
            verification_type,
            identifier,
            success,
            ip_address,
            user_agent
        ) VALUES (
            CASE 
                WHEN TG_TABLE_NAME = 'email_verifications' THEN 'email'
                WHEN TG_TABLE_NAME = 'sms_verifications' THEN 'sms'
            END,
            CASE 
                WHEN TG_TABLE_NAME = 'email_verifications' THEN NEW.email
                WHEN TG_TABLE_NAME = 'sms_verifications' THEN NEW.phone
            END,
            true,
            COALESCE(current_setting('request.header.x-forwarded-for', true)::inet, '127.0.0.1'::inet),
            current_setting('request.header.user-agent', true)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply attempt logging triggers
CREATE TRIGGER email_verification_attempt_log
    AFTER UPDATE ON email_verifications
    FOR EACH ROW EXECUTE FUNCTION log_verification_attempt();

CREATE TRIGGER sms_verification_attempt_log
    AFTER UPDATE ON sms_verifications
    FOR EACH ROW EXECUTE FUNCTION log_verification_attempt();

-- ================================================================
-- 6. CLEANUP FUNCTIONS
-- ================================================================

-- Function to cleanup expired verifications
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS TABLE(email_cleaned integer, sms_cleaned integer) AS $$
DECLARE
    email_count integer;
    sms_count integer;
BEGIN
    -- Clean expired email verifications (older than 24 hours or verified ones older than 7 days)
    DELETE FROM email_verifications 
    WHERE (expires_at < now() AND is_verified = false)
       OR (is_verified = true AND verified_at < now() - interval '7 days');
    GET DIAGNOSTICS email_count = ROW_COUNT;
    
    -- Clean expired SMS verifications (older than 24 hours or verified ones older than 7 days)
    DELETE FROM sms_verifications 
    WHERE (expires_at < now() AND is_verified = false)
       OR (is_verified = true AND verified_at < now() - interval '7 days');
    GET DIAGNOSTICS sms_count = ROW_COUNT;
    
    -- Clean old verification attempts (older than 30 days)
    DELETE FROM verification_attempts 
    WHERE attempted_at < now() - interval '30 days';
    
    RETURN QUERY SELECT email_count, sms_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 7. SECURITY FUNCTIONS
-- ================================================================

-- Function to check if email can be verified (not blocked by rate limits)
CREATE OR REPLACE FUNCTION can_verify_email(email_addr text)
RETURNS boolean AS $$
DECLARE
    recent_attempts integer;
    blocked_until timestamptz;
BEGIN
    -- Check recent failed attempts in last hour
    SELECT COUNT(*)
    INTO recent_attempts
    FROM verification_attempts
    WHERE verification_type = 'email'
      AND identifier = email_addr
      AND success = false
      AND attempted_at > now() - interval '1 hour';
    
    -- If more than 10 failed attempts in last hour, check if still blocked
    IF recent_attempts >= 10 THEN
        SELECT now() + interval '1 hour'
        INTO blocked_until
        FROM verification_attempts
        WHERE verification_type = 'email'
          AND identifier = email_addr
          AND success = false
        ORDER BY attempted_at DESC
        LIMIT 1;
        
        RETURN blocked_until < now();
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if phone can be verified (not blocked by rate limits)
CREATE OR REPLACE FUNCTION can_verify_phone(phone_number text)
RETURNS boolean AS $$
DECLARE
    recent_attempts integer;
    blocked_until timestamptz;
BEGIN
    -- Check recent failed attempts in last hour
    SELECT COUNT(*)
    INTO recent_attempts
    FROM verification_attempts
    WHERE verification_type = 'sms'
      AND identifier = phone_number
      AND success = false
      AND attempted_at > now() - interval '1 hour';
    
    -- If more than 5 failed attempts in last hour, check if still blocked
    IF recent_attempts >= 5 THEN
        SELECT now() + interval '2 hours'
        INTO blocked_until
        FROM verification_attempts
        WHERE verification_type = 'sms'
          AND identifier = phone_number
          AND success = false
        ORDER BY attempted_at DESC
        LIMIT 1;
        
        RETURN blocked_until < now();
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get verification status for user
CREATE OR REPLACE FUNCTION get_verification_status(user_uuid uuid)
RETURNS TABLE(
    email_verified boolean,
    phone_verified boolean,
    email_verified_at timestamptz,
    phone_verified_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.email_verified,
        p.phone_verified,
        p.email_verified_at,
        p.phone_verified_at
    FROM profiles p
    WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on verification tables
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;

-- Email verifications policies
CREATE POLICY "Users can only see their own email verifications" ON email_verifications
    FOR SELECT USING (
        user_id = auth.uid() OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Service role can manage email verifications" ON email_verifications
    FOR ALL USING (
        current_setting('role') = 'service_role'
    );

-- SMS verifications policies
CREATE POLICY "Users can only see their own SMS verifications" ON sms_verifications
    FOR SELECT USING (
        user_id = auth.uid() OR
        phone = (SELECT phone FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Service role can manage SMS verifications" ON sms_verifications
    FOR ALL USING (
        current_setting('role') = 'service_role'
    );

-- Verification attempts policies (read-only for users, full access for service)
CREATE POLICY "Users can see verification attempts for their contact info" ON verification_attempts
    FOR SELECT USING (
        identifier IN (
            SELECT email FROM auth.users WHERE id = auth.uid()
            UNION
            SELECT phone FROM auth.users WHERE id = auth.uid()
        ) OR
        current_setting('role') = 'service_role'
    );

CREATE POLICY "Service role can manage verification attempts" ON verification_attempts
    FOR ALL USING (
        current_setting('role') = 'service_role'
    );

-- ================================================================
-- 9. VALIDATION
-- ================================================================

-- Test the verification system
DO $$
DECLARE
    test_email text := 'test@example.com';
    test_phone text := '+1234567890';
    can_verify_email_result boolean;
    can_verify_phone_result boolean;
BEGIN
    -- Test verification check functions
    can_verify_email_result := can_verify_email(test_email);
    can_verify_phone_result := can_verify_phone(test_phone);
    
    RAISE NOTICE 'Email % can be verified: %', test_email, can_verify_email_result;
    RAISE NOTICE 'Phone % can be verified: %', test_phone, can_verify_phone_result;
    
    RAISE NOTICE 'Verification Tables Migration: COMPLETED SUCCESSFULLY';
END $$;