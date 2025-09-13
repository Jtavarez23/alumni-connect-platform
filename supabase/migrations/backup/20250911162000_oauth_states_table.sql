-- ================================================================
-- ALUMNI CONNECT: OAUTH STATES TABLE
-- File: 20250911162000_oauth_states_table.sql
-- Purpose: Support table for OAuth CSRF protection and state management
-- ================================================================

-- ================================================================
-- 1. OAUTH STATE TRACKING (CSRF Protection)
-- ================================================================

CREATE TABLE IF NOT EXISTS oauth_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    state text NOT NULL UNIQUE,
    provider text NOT NULL CHECK (provider IN ('google', 'facebook', 'linkedin', 'github', 'microsoft')),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    redirect_url text,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- ================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_provider ON oauth_states(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id) WHERE user_id IS NOT NULL;

-- ================================================================
-- 3. CLEANUP FUNCTION
-- ================================================================

-- Function to cleanup expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM oauth_states
    WHERE expires_at < now();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 4. ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on OAuth states table
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- OAuth states policies (service role only, as this is internal state management)
CREATE POLICY "Service role can manage OAuth states" ON oauth_states
    FOR ALL USING (
        current_setting('role') = 'service_role'
    );

-- ================================================================
-- 5. VALIDATION
-- ================================================================

-- Test OAuth states table
DO $$
BEGIN
    RAISE NOTICE 'OAuth States Table Migration: COMPLETED SUCCESSFULLY';
END $$;