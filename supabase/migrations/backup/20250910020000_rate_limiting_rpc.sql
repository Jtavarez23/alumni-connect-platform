-- Rate limiting RPC function for distributed rate limiting
-- This function implements a sliding window rate limiting algorithm

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action_key TEXT,
  p_max_requests INTEGER,
  p_time_window BIGINT
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  reset_time BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_time BIGINT;
  v_window_start BIGINT;
  v_request_count INTEGER;
  v_reset_time BIGINT;
  v_remaining INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Get current time in milliseconds
  v_current_time := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_window_start := v_current_time - p_time_window;
  
  -- Clean up old rate limit records (older than 2 time windows)
  DELETE FROM rate_limits 
  WHERE user_id = p_user_id 
    AND action_key = p_action_key 
    AND timestamp < (v_current_time - (p_time_window * 2));
  
  -- Count requests in current time window
  SELECT COUNT(*) INTO v_request_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action_key = p_action_key
    AND timestamp >= v_window_start;
  
  -- Calculate remaining requests and reset time
  v_remaining := GREATEST(0, p_max_requests - v_request_count);
  v_allowed := v_request_count < p_max_requests;
  v_reset_time := v_window_start + p_time_window;
  
  -- If allowed, record this request
  IF v_allowed THEN
    INSERT INTO rate_limits (user_id, action_key, timestamp)
    VALUES (p_user_id, p_action_key, v_current_time);
  END IF;
  
  -- Return the result
  RETURN QUERY SELECT v_allowed, v_remaining, v_reset_time;
END;
$$;

-- Create rate_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action_time 
  ON rate_limits(user_id, action_key, timestamp);

-- Create index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp 
  ON rate_limits(timestamp);

-- Add RLS policies
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own rate limit records
CREATE POLICY "Users can view own rate limits" ON rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only service role can insert rate limit records (via RPC function)
CREATE POLICY "Service role can insert rate limits" ON rate_limits
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service role can delete rate limit records (via cleanup)
CREATE POLICY "Service role can delete rate limits" ON rate_limits
  FOR DELETE USING (auth.role() = 'service_role');

-- Grant permissions
GRANT USAGE ON SEQUENCE rate_limits_id_seq TO service_role;
GRANT ALL ON rate_limits TO service_role;
GRANT SELECT ON rate_limits TO authenticated;