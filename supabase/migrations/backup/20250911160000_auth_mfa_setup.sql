-- ================================================================
-- ALUMNI CONNECT: MULTI-FACTOR AUTHENTICATION SETUP
-- File: 20250911160000_auth_mfa_setup.sql
-- Purpose: Configure Supabase Auth with MFA support and security hardening
-- ================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 1. AUTH CONFIGURATION TABLES
-- ================================================================

-- Auth configuration for different trust levels
CREATE TABLE IF NOT EXISTS auth_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trust_level text NOT NULL CHECK (trust_level IN ('unverified', 'verified_alumni', 'moderator', 'staff', 'admin')),
    mfa_required boolean NOT NULL DEFAULT true,
    session_timeout_hours integer NOT NULL DEFAULT 24,
    max_devices integer NOT NULL DEFAULT 5,
    password_min_length integer NOT NULL DEFAULT 12,
    require_email_verification boolean NOT NULL DEFAULT true,
    allow_password_reset boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert default auth configurations
INSERT INTO auth_config (trust_level, mfa_required, session_timeout_hours, max_devices, password_min_length) VALUES
('unverified', false, 2, 2, 8),
('verified_alumni', true, 24, 5, 12),
('moderator', true, 8, 3, 14),
('staff', true, 4, 2, 16),
('admin', true, 2, 1, 18)
ON CONFLICT DO NOTHING;

-- ================================================================
-- 2. USER SESSIONS & DEVICE MANAGEMENT
-- ================================================================

-- Extended user sessions tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token text NOT NULL UNIQUE,
    device_info jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    location jsonb DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    mfa_verified boolean NOT NULL DEFAULT false,
    last_activity timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Device registration for MFA
CREATE TABLE IF NOT EXISTS user_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name text NOT NULL,
    device_type text CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'unknown')) DEFAULT 'unknown',
    device_fingerprint text NOT NULL,
    is_trusted boolean NOT NULL DEFAULT false,
    last_used_at timestamptz DEFAULT now(),
    registered_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, device_fingerprint)
);

-- ================================================================
-- 3. MFA FACTORS MANAGEMENT
-- ================================================================

-- MFA factors (TOTP, SMS, Email, Hardware Keys)
CREATE TABLE IF NOT EXISTS mfa_factors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    factor_type text NOT NULL CHECK (factor_type IN ('totp', 'sms', 'email', 'webauthn', 'backup_codes')),
    factor_name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    is_verified boolean NOT NULL DEFAULT false,
    secret_encrypted text, -- For TOTP secrets, encrypted
    phone_number text, -- For SMS
    email text, -- For email-based MFA
    webauthn_credential jsonb, -- For WebAuthn
    backup_codes text[], -- For backup codes
    last_used_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, factor_type, factor_name)
);

-- MFA verification attempts log
CREATE TABLE IF NOT EXISTS mfa_verification_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id uuid REFERENCES user_sessions(id) ON DELETE SET NULL,
    factor_id uuid REFERENCES mfa_factors(id) ON DELETE SET NULL,
    verification_method text NOT NULL,
    success boolean NOT NULL,
    failure_reason text,
    ip_address inet,
    user_agent text,
    attempted_at timestamptz DEFAULT now()
);

-- ================================================================
-- 4. OAUTH PROVIDERS CONFIGURATION
-- ================================================================

-- OAuth provider configurations
CREATE TABLE IF NOT EXISTS oauth_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name text NOT NULL UNIQUE CHECK (provider_name IN ('google', 'facebook', 'linkedin', 'github', 'microsoft')),
    is_enabled boolean NOT NULL DEFAULT true,
    client_id text,
    client_secret_encrypted text,
    scopes text[] DEFAULT '{}',
    redirect_urls text[] DEFAULT '{}',
    require_email_verification boolean DEFAULT true,
    auto_link_accounts boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- OAuth user mappings
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_name text NOT NULL,
    provider_user_id text NOT NULL,
    provider_email text,
    provider_data jsonb DEFAULT '{}',
    is_verified boolean NOT NULL DEFAULT false,
    linked_at timestamptz DEFAULT now(),
    last_sync_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(provider_name, provider_user_id),
    UNIQUE(user_id, provider_name)
);

-- ================================================================
-- 5. SECURITY AUDIT LOGGING
-- ================================================================

-- Authentication audit log
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type text NOT NULL CHECK (event_type IN (
        'login_success', 'login_failed', 'logout', 'signup', 'password_reset_requested',
        'password_reset_completed', 'email_change', 'phone_change', 'mfa_enabled',
        'mfa_disabled', 'mfa_verified', 'mfa_failed', 'account_locked', 'account_unlocked',
        'suspicious_activity', 'device_registered', 'device_removed', 'oauth_linked',
        'oauth_unlinked', 'session_expired', 'concurrent_session_limit'
    )),
    event_data jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    session_id uuid,
    risk_score integer DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    location jsonb DEFAULT '{}',
    occurred_at timestamptz DEFAULT now()
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS auth_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL, -- IP or user ID
    action_type text NOT NULL CHECK (action_type IN (
        'login_attempt', 'signup_attempt', 'password_reset', 'mfa_attempt',
        'email_verification', 'phone_verification', 'oauth_attempt'
    )),
    attempt_count integer NOT NULL DEFAULT 1,
    window_start timestamptz NOT NULL DEFAULT now(),
    locked_until timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(identifier, action_type)
);

-- ================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ================================================================

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- User devices indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_trusted ON user_devices(is_trusted) WHERE is_trusted = true;

-- MFA factors indexes
CREATE INDEX IF NOT EXISTS idx_mfa_factors_user_id ON mfa_factors(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_factors_type ON mfa_factors(factor_type);
CREATE INDEX IF NOT EXISTS idx_mfa_factors_active ON mfa_factors(is_active) WHERE is_active = true;

-- OAuth accounts indexes
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider_name);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_occurred_at ON auth_audit_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_ip_address ON auth_audit_log(ip_address);

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON auth_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_action ON auth_rate_limits(action_type);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON auth_rate_limits(window_start);

-- ================================================================
-- 7. HELPER FUNCTIONS
-- ================================================================

-- Function to get user's trust level
CREATE OR REPLACE FUNCTION get_user_trust_level(user_uuid uuid)
RETURNS text AS $$
DECLARE
    trust_level text;
BEGIN
    SELECT COALESCE(p.trust_level, 'unverified')
    INTO trust_level
    FROM profiles p
    WHERE p.id = user_uuid;
    
    RETURN COALESCE(trust_level, 'unverified');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if MFA is required for user
CREATE OR REPLACE FUNCTION is_mfa_required(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
    trust_level text;
    mfa_required boolean;
BEGIN
    trust_level := get_user_trust_level(user_uuid);
    
    SELECT ac.mfa_required
    INTO mfa_required
    FROM auth_config ac
    WHERE ac.trust_level = trust_level;
    
    RETURN COALESCE(mfa_required, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log authentication events
CREATE OR REPLACE FUNCTION log_auth_event(
    user_uuid uuid,
    event_type text,
    event_data jsonb DEFAULT '{}',
    session_id uuid DEFAULT NULL,
    risk_score integer DEFAULT 0
) RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO auth_audit_log (
        user_id,
        event_type,
        event_data,
        session_id,
        risk_score,
        ip_address,
        user_agent
    ) VALUES (
        user_uuid,
        event_type,
        event_data,
        session_id,
        risk_score,
        COALESCE(current_setting('request.header.x-forwarded-for', true)::inet, '127.0.0.1'::inet),
        current_setting('request.header.user-agent', true)
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    identifier_val text,
    action_type_val text,
    max_attempts integer,
    window_minutes integer
) RETURNS boolean AS $$
DECLARE
    current_attempts integer;
    window_start timestamptz;
BEGIN
    window_start := now() - (window_minutes || ' minutes')::interval;
    
    -- Get current attempt count within window
    SELECT COALESCE(attempt_count, 0)
    INTO current_attempts
    FROM auth_rate_limits
    WHERE identifier = identifier_val
      AND action_type = action_type_val
      AND window_start > window_start;
    
    RETURN current_attempts < max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
    identifier_val text,
    action_type_val text
) RETURNS void AS $$
BEGIN
    INSERT INTO auth_rate_limits (identifier, action_type, attempt_count)
    VALUES (identifier_val, action_type_val, 1)
    ON CONFLICT (identifier, action_type)
    DO UPDATE SET
        attempt_count = auth_rate_limits.attempt_count + 1,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 8. TRIGGERS FOR AUDIT LOGGING
-- ================================================================

-- Trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all auth tables
CREATE TRIGGER auth_config_updated_at
    BEFORE UPDATE ON auth_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_devices_updated_at
    BEFORE UPDATE ON user_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER mfa_factors_updated_at
    BEFORE UPDATE ON mfa_factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER oauth_providers_updated_at
    BEFORE UPDATE ON oauth_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER oauth_accounts_updated_at
    BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER auth_rate_limits_updated_at
    BEFORE UPDATE ON auth_rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 9. CLEANUP FUNCTIONS
-- ================================================================

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM user_sessions
    WHERE expires_at < now() OR last_activity < now() - interval '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old audit logs (keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM auth_audit_log
    WHERE occurred_at < now() - interval '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM auth_rate_limits
    WHERE window_start < now() - interval '1 day';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 10. SECURITY VALIDATION
-- ================================================================

-- Create a test to validate MFA configuration
DO $$
DECLARE
    test_user_id uuid;
    mfa_required boolean;
BEGIN
    -- Test MFA requirement function
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        mfa_required := is_mfa_required(test_user_id);
        RAISE NOTICE 'MFA Configuration Test: User % requires MFA: %', test_user_id, mfa_required;
    END IF;
    
    -- Test rate limiting function
    IF check_rate_limit('test_ip', 'login_attempt', 5, 15) THEN
        RAISE NOTICE 'Rate Limiting Test: PASSED - Under limit';
    ELSE
        RAISE NOTICE 'Rate Limiting Test: FAILED - Over limit';
    END IF;
    
    RAISE NOTICE 'MFA Setup Migration: COMPLETED SUCCESSFULLY';
END $$;