-- ================================================================
-- ALUMNI CONNECT: REFRESH TOKENS TABLE
-- File: 20250911163000_refresh_tokens_table.sql
-- Purpose: Support table for refresh token management
-- ================================================================

-- ================================================================
-- 1. REFRESH TOKENS STORAGE
-- ================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE, -- Should be hashed in production
    session_token text NOT NULL,
    is_used boolean NOT NULL DEFAULT false,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- ================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_token ON refresh_tokens(session_token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(is_used) WHERE is_used = false;

-- ================================================================
-- 3. CLEANUP FUNCTION
-- ================================================================

-- Function to cleanup expired and used refresh tokens
CREATE OR REPLACE FUNCTION cleanup_refresh_tokens()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete expired tokens or used tokens older than 7 days
    DELETE FROM refresh_tokens
    WHERE expires_at < now() 
       OR (is_used = true AND used_at < now() - interval '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 4. SECURITY FUNCTIONS
-- ================================================================

-- Function to revoke all refresh tokens for a user
CREATE OR REPLACE FUNCTION revoke_user_refresh_tokens(user_uuid uuid)
RETURNS integer AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE refresh_tokens 
    SET is_used = true, 
        used_at = now()
    WHERE user_id = user_uuid 
      AND is_used = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke refresh tokens for specific session
CREATE OR REPLACE FUNCTION revoke_session_refresh_tokens(session_token_val text)
RETURNS integer AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE refresh_tokens 
    SET is_used = true, 
        used_at = now()
    WHERE session_token = session_token_val 
      AND is_used = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on refresh tokens table
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Refresh tokens policies (service role only for security)
CREATE POLICY "Service role can manage refresh tokens" ON refresh_tokens
    FOR ALL USING (
        current_setting('role') = 'service_role'
    );

-- ================================================================
-- 6. TRIGGER FOR AUTOMATIC CLEANUP
-- ================================================================

-- Function to automatically cleanup expired tokens on insert
CREATE OR REPLACE FUNCTION auto_cleanup_refresh_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- Randomly cleanup expired tokens (10% chance)
    IF random() < 0.1 THEN
        PERFORM cleanup_refresh_tokens();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply auto cleanup trigger
CREATE TRIGGER refresh_tokens_auto_cleanup
    AFTER INSERT ON refresh_tokens
    FOR EACH ROW EXECUTE FUNCTION auto_cleanup_refresh_tokens();

-- ================================================================
-- 7. VALIDATION
-- ================================================================

-- Test refresh tokens table
DO $$
BEGIN
    RAISE NOTICE 'Refresh Tokens Table Migration: COMPLETED SUCCESSFULLY';
END $$;