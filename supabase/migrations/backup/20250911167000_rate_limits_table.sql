-- ================================================================
-- ALUMNI CONNECT: RATE LIMITING TABLE
-- File: 20250911167000_rate_limits_table.sql
-- Purpose: Support table for comprehensive rate limiting system
-- ================================================================

-- ================================================================
-- 1. RATE LIMITS TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL, -- IP address, user ID, or custom identifier
    limit_type text NOT NULL CHECK (limit_type IN (
        'login_attempts', 'signup_attempts', 'password_reset', 'mfa_attempts',
        'api_general', 'api_search', 'api_upload', 'post_creation', 'comment_creation',
        'message_sending', 'claim_submission', 'verification_requests',
        'gdpr_export', 'gdpr_deletion', 'report_submission', 'connection_requests',
        'custom_limit'
    )),
    request_count integer NOT NULL DEFAULT 0,
    violation_count integer NOT NULL DEFAULT 0,
    window_start timestamptz NOT NULL DEFAULT now(),
    blocked_until timestamptz,
    last_request_at timestamptz NOT NULL DEFAULT now(),
    last_request_metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(identifier, limit_type, window_start)
);

-- ================================================================
-- 2. RATE LIMIT CONFIGURATIONS (for custom limits)
-- ================================================================

CREATE TABLE IF NOT EXISTS rate_limit_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    limit_type text NOT NULL UNIQUE,
    max_requests integer NOT NULL,
    window_seconds integer NOT NULL,
    block_duration_seconds integer NOT NULL DEFAULT 3600,
    progressive_penalties boolean NOT NULL DEFAULT false,
    description text NOT NULL,
    category text NOT NULL CHECK (category IN (
        'authentication', 'api', 'content', 'verification', 
        'gdpr', 'moderation', 'social', 'custom'
    )),
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert default rate limit configurations
INSERT INTO rate_limit_configs (
    limit_type, max_requests, window_seconds, block_duration_seconds, 
    progressive_penalties, description, category
) VALUES
    ('login_attempts', 5, 900, 3600, true, 'Login attempts per IP/user', 'authentication'),
    ('signup_attempts', 3, 3600, 7200, false, 'Account creation attempts per IP', 'authentication'),
    ('password_reset', 3, 3600, 1800, false, 'Password reset requests', 'authentication'),
    ('mfa_attempts', 10, 3600, 1800, true, 'MFA verification attempts', 'authentication'),
    ('api_general', 1000, 3600, 300, false, 'General API requests per user', 'api'),
    ('api_search', 100, 3600, 600, false, 'Search API requests per user', 'api'),
    ('api_upload', 50, 3600, 1800, false, 'File upload requests per user', 'api'),
    ('post_creation', 20, 3600, 1800, false, 'Post creation per user', 'content'),
    ('comment_creation', 50, 3600, 900, false, 'Comment creation per user', 'content'),
    ('message_sending', 100, 3600, 1800, false, 'Private message sending per user', 'content'),
    ('claim_submission', 10, 3600, 3600, false, 'Yearbook claim submissions per user', 'verification'),
    ('verification_requests', 5, 3600, 7200, false, 'Email/SMS verification requests', 'verification'),
    ('gdpr_export', 1, 86400, 86400, false, 'GDPR data export requests per user', 'gdpr'),
    ('gdpr_deletion', 1, 604800, 604800, false, 'GDPR data deletion requests per user', 'gdpr'),
    ('report_submission', 10, 3600, 1800, false, 'Content report submissions per user', 'moderation'),
    ('connection_requests', 20, 3600, 1800, false, 'Connection requests per user', 'social')
ON CONFLICT (limit_type) DO UPDATE SET
    max_requests = EXCLUDED.max_requests,
    window_seconds = EXCLUDED.window_seconds,
    block_duration_seconds = EXCLUDED.block_duration_seconds,
    progressive_penalties = EXCLUDED.progressive_penalties,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    updated_at = now();

-- ================================================================
-- 3. RATE LIMIT VIOLATIONS LOG
-- ================================================================

CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    limit_type text NOT NULL,
    violation_count integer NOT NULL,
    request_count integer NOT NULL,
    max_allowed integer NOT NULL,
    window_start timestamptz NOT NULL,
    blocked_until timestamptz,
    ip_address inet,
    user_agent text,
    endpoint text,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}',
    occurred_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ================================================================

-- Rate limits indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_limit_type ON rate_limits(limit_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_type ON rate_limits(identifier, limit_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until ON rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rate_limits_last_request ON rate_limits(last_request_at);

-- Rate limit configs indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_category ON rate_limit_configs(category);
CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_active ON rate_limit_configs(is_active) WHERE is_active = true;

-- Rate limit violations indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_identifier ON rate_limit_violations(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_limit_type ON rate_limit_violations(limit_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user_id ON rate_limit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_occurred_at ON rate_limit_violations(occurred_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip ON rate_limit_violations(ip_address);

-- ================================================================
-- 5. TRIGGERS AND FUNCTIONS
-- ================================================================

-- Updated at triggers
CREATE TRIGGER rate_limits_updated_at
    BEFORE UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER rate_limit_configs_updated_at
    BEFORE UPDATE ON rate_limit_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to log rate limit violations
CREATE OR REPLACE FUNCTION log_rate_limit_violation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log violation when blocked_until is set or updated
    IF NEW.blocked_until IS NOT NULL AND (OLD.blocked_until IS NULL OR OLD.blocked_until IS DISTINCT FROM NEW.blocked_until) THEN
        INSERT INTO rate_limit_violations (
            identifier,
            limit_type,
            violation_count,
            request_count,
            max_allowed,
            window_start,
            blocked_until,
            ip_address,
            user_agent,
            endpoint,
            user_id,
            metadata
        ) VALUES (
            NEW.identifier,
            NEW.limit_type,
            NEW.violation_count,
            NEW.request_count,
            COALESCE((NEW.last_request_metadata->>'max_allowed')::integer, 0),
            NEW.window_start,
            NEW.blocked_until,
            COALESCE((NEW.last_request_metadata->>'ip_address')::inet, 
                     current_setting('request.header.x-forwarded-for', true)::inet),
            COALESCE((NEW.last_request_metadata->>'user_agent')::text,
                     current_setting('request.header.user-agent', true)),
            (NEW.last_request_metadata->>'endpoint')::text,
            (NEW.last_request_metadata->>'user_id')::uuid,
            NEW.last_request_metadata
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply violation logging trigger
CREATE TRIGGER rate_limits_violation_trigger
    AFTER UPDATE ON rate_limits
    FOR EACH ROW EXECUTE FUNCTION log_rate_limit_violation();

-- ================================================================
-- 6. RATE LIMITING UTILITY FUNCTIONS
-- ================================================================

-- Function to check if identifier is currently rate limited
CREATE OR REPLACE FUNCTION is_rate_limited(
    identifier_val text,
    limit_type_val text
) RETURNS boolean AS $$
DECLARE
    rate_limit_record RECORD;
    config_record RECORD;
    current_time timestamptz := now();
    window_start timestamptz;
BEGIN
    -- Get configuration
    SELECT * INTO config_record
    FROM rate_limit_configs
    WHERE limit_type = limit_type_val AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false; -- No config means no limit
    END IF;
    
    -- Calculate window start
    window_start := current_time - (config_record.window_seconds || ' seconds')::interval;
    
    -- Get current rate limit status
    SELECT * INTO rate_limit_record
    FROM rate_limits
    WHERE identifier = identifier_val
      AND limit_type = limit_type_val
      AND window_start >= window_start
    ORDER BY window_start DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN false; -- No rate limit record
    END IF;
    
    -- Check if blocked
    IF rate_limit_record.blocked_until IS NOT NULL AND rate_limit_record.blocked_until > current_time THEN
        RETURN true; -- Currently blocked
    END IF;
    
    -- Check if over limit
    RETURN rate_limit_record.request_count >= config_record.max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get remaining requests for identifier
CREATE OR REPLACE FUNCTION get_remaining_requests(
    identifier_val text,
    limit_type_val text
) RETURNS integer AS $$
DECLARE
    rate_limit_record RECORD;
    config_record RECORD;
    current_time timestamptz := now();
    window_start timestamptz;
BEGIN
    -- Get configuration
    SELECT * INTO config_record
    FROM rate_limit_configs
    WHERE limit_type = limit_type_val AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN -1; -- No config means unlimited
    END IF;
    
    -- Calculate window start
    window_start := current_time - (config_record.window_seconds || ' seconds')::interval;
    
    -- Get current rate limit status
    SELECT * INTO rate_limit_record
    FROM rate_limits
    WHERE identifier = identifier_val
      AND limit_type = limit_type_val
      AND window_start >= window_start
    ORDER BY window_start DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN config_record.max_requests; -- Full limit available
    END IF;
    
    -- Check if blocked
    IF rate_limit_record.blocked_until IS NOT NULL AND rate_limit_record.blocked_until > current_time THEN
        RETURN 0; -- Currently blocked
    END IF;
    
    -- Return remaining requests
    RETURN GREATEST(0, config_record.max_requests - rate_limit_record.request_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete rate limit records older than their window + block duration
    WITH expired_limits AS (
        SELECT rl.id
        FROM rate_limits rl
        JOIN rate_limit_configs rlc ON rl.limit_type = rlc.limit_type
        WHERE rl.window_start < now() - 
              (rlc.window_seconds + COALESCE(rlc.block_duration_seconds, 3600) || ' seconds')::interval
          AND (rl.blocked_until IS NULL OR rl.blocked_until < now())
    )
    DELETE FROM rate_limits
    WHERE id IN (SELECT id FROM expired_limits);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clean up old violation logs (keep for 30 days)
    DELETE FROM rate_limit_violations
    WHERE occurred_at < now() - interval '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate limit statistics
CREATE OR REPLACE FUNCTION get_rate_limit_stats(
    limit_type_filter text DEFAULT NULL,
    time_period interval DEFAULT '24 hours'::interval
) RETURNS TABLE(
    limit_type text,
    total_requests bigint,
    unique_identifiers bigint,
    violations bigint,
    currently_blocked bigint,
    avg_requests_per_identifier numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            rl.limit_type,
            COUNT(*) as total_requests,
            COUNT(DISTINCT rl.identifier) as unique_identifiers,
            COALESCE(v.violations, 0) as violations,
            COALESCE(b.blocked, 0) as currently_blocked
        FROM rate_limits rl
        LEFT JOIN (
            SELECT 
                limit_type, 
                COUNT(*) as violations
            FROM rate_limit_violations
            WHERE occurred_at > now() - time_period
            GROUP BY limit_type
        ) v ON rl.limit_type = v.limit_type
        LEFT JOIN (
            SELECT 
                limit_type,
                COUNT(*) as blocked
            FROM rate_limits
            WHERE blocked_until > now()
            GROUP BY limit_type
        ) b ON rl.limit_type = b.limit_type
        WHERE rl.last_request_at > now() - time_period
          AND (limit_type_filter IS NULL OR rl.limit_type = limit_type_filter)
        GROUP BY rl.limit_type, v.violations, b.blocked
    )
    SELECT 
        s.limit_type,
        s.total_requests,
        s.unique_identifiers,
        s.violations,
        s.currently_blocked,
        CASE 
            WHEN s.unique_identifiers > 0 THEN 
                ROUND(s.total_requests::numeric / s.unique_identifiers::numeric, 2)
            ELSE 0
        END as avg_requests_per_identifier
    FROM stats s
    ORDER BY s.total_requests DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 7. ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on rate limiting tables
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- Rate limits policies (service role and moderators only)
CREATE POLICY "Service role can manage rate limits" ON rate_limits
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Moderators can view rate limits" ON rate_limits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
              AND trust_level IN ('moderator', 'staff', 'admin')
        )
    );

-- Rate limit configs policies
CREATE POLICY "Service role can manage rate limit configs" ON rate_limit_configs
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Moderators can view rate limit configs" ON rate_limit_configs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
              AND trust_level IN ('moderator', 'staff', 'admin')
        )
    );

CREATE POLICY "Admins can manage rate limit configs" ON rate_limit_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
              AND trust_level IN ('staff', 'admin')
        )
    );

-- Rate limit violations policies
CREATE POLICY "Service role can manage violations" ON rate_limit_violations
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Moderators can view violations" ON rate_limit_violations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
              AND trust_level IN ('moderator', 'staff', 'admin')
        )
    );

-- ================================================================
-- 8. VALIDATION AND TESTING
-- ================================================================

-- Test rate limiting functions
DO $$
DECLARE
    test_identifier text := 'test_user_123';
    test_limit_type text := 'api_general';
    is_limited boolean;
    remaining_requests integer;
    stats_result RECORD;
BEGIN
    -- Test rate limiting functions
    is_limited := is_rate_limited(test_identifier, test_limit_type);
    remaining_requests := get_remaining_requests(test_identifier, test_limit_type);
    
    RAISE NOTICE 'Test identifier % is rate limited: %', test_identifier, is_limited;
    RAISE NOTICE 'Remaining requests for %: %', test_identifier, remaining_requests;
    
    -- Test cleanup function
    PERFORM cleanup_expired_rate_limits();
    
    -- Test statistics function
    FOR stats_result IN 
        SELECT * FROM get_rate_limit_stats(NULL, '1 hour'::interval) LIMIT 3
    LOOP
        RAISE NOTICE 'Rate limit stats for %: % requests, % violations', 
            stats_result.limit_type, 
            stats_result.total_requests, 
            stats_result.violations;
    END LOOP;
    
    RAISE NOTICE 'Rate Limits Table Migration: COMPLETED SUCCESSFULLY';
END $$;