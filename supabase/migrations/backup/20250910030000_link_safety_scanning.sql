-- Link Safety Scanning System
-- AC-ARCH-003 compliant URL safety scanning implementation

-- Create link scanning queue table
CREATE TABLE IF NOT EXISTS public.link_scan_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_table TEXT NOT NULL, -- 'posts', 'messages', 'comments', 'profiles'
  target_id uuid NOT NULL,
  urls TEXT[] NOT NULL, -- Array of URLs to scan
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'safe', 'unsafe', 'error')),
  findings JSONB DEFAULT '{}',
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create link scan results table for historical tracking
CREATE TABLE IF NOT EXISTS public.link_scan_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('safe', 'unsafe', 'error')),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  categories TEXT[], -- ['phishing', 'malware', 'scam', 'adult', 'violence', 'hate', 'spam']
  confidence_score NUMERIC(3,2),
  provider TEXT, -- 'google_safebrowsing', 'virus_total', 'custom'
  raw_response JSONB,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_link_scan_queue_status ON link_scan_queue(status);
CREATE INDEX IF NOT EXISTS idx_link_scan_queue_target ON link_scan_queue(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_link_scan_results_url ON link_scan_results(url);
CREATE INDEX IF NOT EXISTS idx_link_scan_results_domain ON link_scan_results(domain);

-- Add RLS policies
ALTER TABLE link_scan_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_scan_results ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage link scanning queue
CREATE POLICY "Service role can manage link scan queue" ON link_scan_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Only service role can manage scan results
CREATE POLICY "Service role can manage scan results" ON link_scan_results
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Authenticated users can view their own scan results (via joins)
CREATE POLICY "Users can view own scan results" ON link_scan_results
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM link_scan_queue lsq
    JOIN posts p ON lsq.target_table = 'posts' AND lsq.target_id = p.id
    WHERE p.author_id = auth.uid() AND lsq.findings::text LIKE '%' || link_scan_results.url || '%'
  ) OR EXISTS (
    SELECT 1 FROM link_scan_queue lsq
    JOIN messages m ON lsq.target_table = 'messages' AND lsq.target_id = m.id
    WHERE m.sender_id = auth.uid() AND lsq.findings::text LIKE '%' || link_scan_results.url || '%'
  ));

-- Grant permissions
GRANT ALL ON link_scan_queue TO service_role;
GRANT ALL ON link_scan_results TO service_role;
GRANT SELECT ON link_scan_results TO authenticated;

-- RPC function to queue URLs for scanning
CREATE OR REPLACE FUNCTION queue_urls_for_scanning(
  p_target_table TEXT,
  p_target_id UUID,
  p_urls TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  -- Insert into scanning queue
  INSERT INTO link_scan_queue (target_table, target_id, urls, status)
  VALUES (p_target_table, p_target_id, p_urls, 'pending')
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$;

-- RPC function to check if URLs are safe
CREATE OR REPLACE FUNCTION check_urls_safe(
  p_urls TEXT[]
)
RETURNS TABLE (
  url TEXT,
  is_safe BOOLEAN,
  risk_level TEXT,
  categories TEXT[],
  last_scan TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lsr.url,
    lsr.status = 'safe' AS is_safe,
    COALESCE(lsr.risk_level, 'unknown') AS risk_level,
    COALESCE(lsr.categories, '{}') AS categories,
    lsr.scanned_at AS last_scan
  FROM link_scan_results lsr
  WHERE lsr.url = ANY(p_urls)
    AND lsr.scanned_at > (NOW() - INTERVAL '30 days') -- Only use recent scans
  UNION ALL
  SELECT 
    unnest(p_urls) AS url,
    true AS is_safe, -- Default to safe for unknown URLs
    'unknown' AS risk_level,
    '{}' AS categories,
    NULL AS last_scan
  WHERE NOT EXISTS (
    SELECT 1 FROM link_scan_results 
    WHERE url = ANY(p_urls) 
    AND scanned_at > (NOW() - INTERVAL '30 days')
  );
END;
$$;

-- Trigger function to automatically scan URLs in posts
CREATE OR REPLACE FUNCTION trigger_post_url_scan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_urls TEXT[];
BEGIN
  -- Extract URLs from post text using regex
  SELECT ARRAY(
    SELECT DISTINCT regexp_matches(NEW.text, 'https?:\/\/[^\s<>"\'{}|\\^`\[\]]+', 'gi')
  ) INTO v_urls;
  
  -- If URLs found, queue for scanning
  IF array_length(v_urls, 1) > 0 THEN
    PERFORM queue_urls_for_scanning('posts', NEW.id, v_urls);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for posts
DROP TRIGGER IF EXISTS trigger_post_url_scan ON posts;
CREATE TRIGGER trigger_post_url_scan
  AFTER INSERT OR UPDATE OF text ON posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_post_url_scan();

-- Similar triggers can be added for messages, comments, etc.

-- Function to get URL scanning status for a target
CREATE OR REPLACE FUNCTION get_url_scan_status(
  p_target_table TEXT,
  p_target_id UUID
)
RETURNS TABLE (
  status TEXT,
  unsafe_urls TEXT[],
  total_urls INTEGER,
  scanned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lsq.status,
    ARRAY(
      SELECT url FROM jsonb_array_elements_text(lsq.findings->'unsafe_urls')
    ) AS unsafe_urls,
    array_length(lsq.urls, 1) AS total_urls,
    lsq.scanned_at
  FROM link_scan_queue lsq
  WHERE lsq.target_table = p_target_table
    AND lsq.target_id = p_target_id;
END;
$$;