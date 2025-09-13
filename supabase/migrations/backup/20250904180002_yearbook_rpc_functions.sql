-- Alumni Connect - RPC Functions for Yearbook Processing Pipeline
-- Implements core business logic functions as specified in AC-ARCH-002b and AC-ARCH-003

-- Function to start yearbook processing
CREATE OR REPLACE FUNCTION start_yearbook_processing(p_yearbook_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  yearbook_record yearbooks%ROWTYPE;
BEGIN
  -- Get yearbook record
  SELECT * INTO yearbook_record FROM yearbooks WHERE id = p_yearbook_id;
  
  IF yearbook_record.id IS NULL THEN
    RETURN json_build_object('error', 'Yearbook not found');
  END IF;
  
  -- Check if user owns the yearbook
  IF yearbook_record.uploaded_by != auth.uid() THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;
  
  -- Insert into safety queue for processing
  INSERT INTO safety_queue (yearbook_id, status)
  VALUES (p_yearbook_id, 'pending')
  ON CONFLICT (yearbook_id) DO UPDATE SET
    status = 'pending',
    updated_at = now();
    
  -- Update yearbook status
  UPDATE yearbooks 
  SET status = 'pending', updated_at = now()
  WHERE id = p_yearbook_id;
  
  RETURN json_build_object('success', true, 'message', 'Processing started');
END;
$$;

-- Function to submit a claim
CREATE OR REPLACE FUNCTION submit_claim(p_page_face_id uuid DEFAULT NULL, p_page_name_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claim_id uuid;
BEGIN
  -- Validate input
  IF p_page_face_id IS NULL AND p_page_name_id IS NULL THEN
    RETURN json_build_object('error', 'Must provide either page_face_id or page_name_id');
  END IF;
  
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Authentication required');
  END IF;
  
  -- Check if claim already exists
  IF EXISTS (
    SELECT 1 FROM claims 
    WHERE user_id = auth.uid() 
    AND (page_face_id = p_page_face_id OR page_name_id = p_page_name_id)
  ) THEN
    RETURN json_build_object('error', 'Claim already exists');
  END IF;
  
  -- Insert claim
  INSERT INTO claims (user_id, page_face_id, page_name_id, status)
  VALUES (auth.uid(), p_page_face_id, p_page_name_id, 'pending')
  RETURNING id INTO claim_id;
  
  -- Create notification for moderators (simplified)
  INSERT INTO notifications (user_id, kind, payload)
  SELECT 
    p.id,
    'new_claim_submitted',
    json_build_object(
      'claim_id', claim_id,
      'claimant_name', claimant.first_name || ' ' || claimant.last_name
    )
  FROM profiles p
  JOIN profiles claimant ON claimant.id = auth.uid()
  WHERE p.trust_level IN ('moderator', 'staff');
  
  RETURN json_build_object(
    'success', true, 
    'claim_id', claim_id,
    'message', 'Claim submitted for review'
  );
END;
$$;

-- Function to approve a claim (moderators only)
CREATE OR REPLACE FUNCTION approve_claim(p_claim_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claim_record claims%ROWTYPE;
  user_record profiles%ROWTYPE;
BEGIN
  -- Check if user is moderator
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND trust_level IN ('moderator', 'staff')
  ) THEN
    RETURN json_build_object('error', 'Unauthorized - moderator access required');
  END IF;
  
  -- Get claim record
  SELECT * INTO claim_record FROM claims WHERE id = p_claim_id;
  
  IF claim_record.id IS NULL THEN
    RETURN json_build_object('error', 'Claim not found');
  END IF;
  
  -- Update claim status
  UPDATE claims 
  SET 
    status = 'approved',
    verified_by = auth.uid(),
    verified_at = now()
  WHERE id = p_claim_id;
  
  -- Update face as claimed
  IF claim_record.page_face_id IS NOT NULL THEN
    UPDATE page_faces 
    SET claimed_by = claim_record.user_id
    WHERE id = claim_record.page_face_id;
  END IF;
  
  -- Upgrade user trust level to verified_alumni
  UPDATE profiles 
  SET trust_level = 'verified_alumni'
  WHERE id = claim_record.user_id 
  AND trust_level = 'unverified';
  
  -- Create notification for the claimant
  INSERT INTO notifications (user_id, kind, payload)
  VALUES (
    claim_record.user_id,
    'claim_approved',
    json_build_object(
      'claim_id', p_claim_id,
      'message', 'Your photo claim has been approved!'
    )
  );
  
  RETURN json_build_object('success', true, 'status', 'approved');
END;
$$;

-- Function to reject a claim (moderators only)
CREATE OR REPLACE FUNCTION reject_claim(p_claim_id uuid, p_reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claim_record claims%ROWTYPE;
BEGIN
  -- Check if user is moderator
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND trust_level IN ('moderator', 'staff')
  ) THEN
    RETURN json_build_object('error', 'Unauthorized - moderator access required');
  END IF;
  
  -- Get claim record
  SELECT * INTO claim_record FROM claims WHERE id = p_claim_id;
  
  IF claim_record.id IS NULL THEN
    RETURN json_build_object('error', 'Claim not found');
  END IF;
  
  -- Update claim status
  UPDATE claims 
  SET 
    status = 'rejected',
    verified_by = auth.uid(),
    verified_at = now()
  WHERE id = p_claim_id;
  
  -- Create notification for the claimant
  INSERT INTO notifications (user_id, kind, payload)
  VALUES (
    claim_record.user_id,
    'claim_rejected',
    json_build_object(
      'claim_id', p_claim_id,
      'reason', COALESCE(p_reason, 'Claim could not be verified'),
      'message', 'Your photo claim has been reviewed'
    )
  );
  
  RETURN json_build_object('success', true, 'status', 'rejected');
END;
$$;

-- Function to get network feed (simplified version)
CREATE OR REPLACE FUNCTION get_network_feed(p_cursor timestamptz DEFAULT NULL, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  school_id uuid,
  text text,
  media jsonb,
  metrics jsonb,
  created_at timestamptz,
  author_profile jsonb,
  school_info jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.author_id,
    p.school_id,
    p.text,
    p.media,
    p.metrics,
    p.created_at,
    json_build_object(
      'id', prof.id,
      'first_name', prof.first_name,
      'last_name', prof.last_name,
      'avatar_url', prof.avatar_url,
      'trust_level', prof.trust_level
    )::jsonb as author_profile,
    CASE 
      WHEN p.school_id IS NOT NULL THEN
        json_build_object(
          'id', s.id,
          'name', s.name,
          'location', s.location
        )::jsonb
      ELSE NULL
    END as school_info
  FROM posts p
  JOIN profiles prof ON prof.id = p.author_id
  LEFT JOIN schools s ON s.id = p.school_id
  WHERE (
    -- Posts from connections
    EXISTS (
      SELECT 1 FROM connections c
      WHERE ((c.user_id = auth.uid() AND c.connection_id = p.author_id) OR
             (c.user_id = p.author_id AND c.connection_id = auth.uid()))
      AND c.status = 'accepted'
    ) OR
    -- Posts from same school
    (p.school_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_education ue
      WHERE ue.user_id = auth.uid() AND ue.school_id = p.school_id
    )) OR
    -- Own posts
    p.author_id = auth.uid()
  )
  AND (p_cursor IS NULL OR p.created_at < p_cursor)
  ORDER BY p.created_at DESC
  LIMIT p_limit;
$$;

-- Function to get For You feed (trending content)
CREATE OR REPLACE FUNCTION get_foryou_feed(p_cursor timestamptz DEFAULT NULL, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  school_id uuid,
  text text,
  media jsonb,
  metrics jsonb,
  created_at timestamptz,
  author_profile jsonb,
  school_info jsonb,
  engagement_score numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.author_id,
    p.school_id,
    p.text,
    p.media,
    p.metrics,
    p.created_at,
    json_build_object(
      'id', prof.id,
      'first_name', prof.first_name,
      'last_name', prof.last_name,
      'avatar_url', prof.avatar_url,
      'trust_level', prof.trust_level
    )::jsonb as author_profile,
    CASE 
      WHEN p.school_id IS NOT NULL THEN
        json_build_object(
          'id', s.id,
          'name', s.name,
          'location', s.location
        )::jsonb
      ELSE NULL
    END as school_info,
    -- Simple engagement score calculation
    (
      COALESCE((p.metrics->>'like_count')::integer, 0) * 1.0 +
      COALESCE((p.metrics->>'comment_count')::integer, 0) * 2.0 +
      COALESCE((p.metrics->>'share_count')::integer, 0) * 3.0
    ) / GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0, 1.0) as engagement_score
  FROM posts p
  JOIN profiles prof ON prof.id = p.author_id
  LEFT JOIN schools s ON s.id = p.school_id
  WHERE p.visibility IN ('public', 'alumni_only')
  AND (p_cursor IS NULL OR p.created_at < p_cursor)
  ORDER BY engagement_score DESC, p.created_at DESC
  LIMIT p_limit;
$$;

-- Function to create an event
CREATE OR REPLACE FUNCTION create_event(
  p_host_type text,
  p_host_id uuid,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_is_virtual boolean DEFAULT false,
  p_visibility visibility DEFAULT 'alumni_only',
  p_ticketing_enabled boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id uuid;
  can_create boolean := false;
BEGIN
  -- Validate host type
  IF p_host_type NOT IN ('school', 'group', 'user') THEN
    RETURN json_build_object('error', 'Invalid host type');
  END IF;
  
  -- Check permissions based on host type
  CASE p_host_type
    WHEN 'user' THEN
      can_create := (p_host_id = auth.uid());
    WHEN 'school' THEN
      can_create := EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND trust_level IN ('school_admin', 'moderator', 'staff')
      ) OR EXISTS (
        SELECT 1 FROM user_education ue
        WHERE ue.user_id = auth.uid() 
        AND ue.school_id = p_host_id
        AND ue.role_type = 'administrator'
      );
    WHEN 'group' THEN
      can_create := EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = p_host_id 
        AND gm.user_id = auth.uid()
        AND gm.role IN ('owner', 'admin')
      );
  END CASE;
  
  IF NOT can_create THEN
    RETURN json_build_object('error', 'Insufficient permissions to create event for this host');
  END IF;
  
  -- Insert event
  INSERT INTO events (
    host_type, host_id, title, description, starts_at, ends_at,
    location, is_virtual, visibility, ticketing_enabled, created_by
  )
  VALUES (
    p_host_type, p_host_id, p_title, p_description, p_starts_at, p_ends_at,
    p_location, p_is_virtual, p_visibility, p_ticketing_enabled, auth.uid()
  )
  RETURNING id INTO event_id;
  
  RETURN json_build_object('success', true, 'event_id', event_id);
END;
$$;

-- Function to report content
CREATE OR REPLACE FUNCTION report_item(
  p_target_table text,
  p_target_id uuid,
  p_reason report_reason,
  p_details text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  report_id uuid;
BEGIN
  -- Validate target table
  IF p_target_table NOT IN ('posts', 'profiles', 'yearbook_pages', 'comments', 'events') THEN
    RETURN json_build_object('error', 'Invalid target table');
  END IF;
  
  -- Check if user already reported this item
  IF EXISTS (
    SELECT 1 FROM moderation_reports
    WHERE reporter_id = auth.uid()
    AND target_table = p_target_table
    AND target_id = p_target_id
    AND created_at > now() - interval '24 hours'
  ) THEN
    RETURN json_build_object('error', 'Already reported this item recently');
  END IF;
  
  -- Insert report
  INSERT INTO moderation_reports (reporter_id, target_table, target_id, reason, details)
  VALUES (auth.uid(), p_target_table, p_target_id, p_reason, p_details)
  RETURNING id INTO report_id;
  
  -- Notify moderators
  INSERT INTO notifications (user_id, kind, payload)
  SELECT 
    p.id,
    'new_report_submitted',
    json_build_object(
      'report_id', report_id,
      'target_table', p_target_table,
      'reason', p_reason
    )
  FROM profiles p
  WHERE p.trust_level IN ('moderator', 'staff');
  
  RETURN json_build_object('success', true, 'report_id', report_id);
END;
$$;

-- Function to send a message (simplified)
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id uuid,
  p_text text DEFAULT NULL,
  p_media jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_id uuid;
  can_send boolean := false;
BEGIN
  -- Check if user is member of conversation
  IF EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid()
  ) THEN
    can_send := true;
  END IF;
  
  IF NOT can_send THEN
    RETURN json_build_object('error', 'Not authorized to send messages in this conversation');
  END IF;
  
  -- Validate message content
  IF p_text IS NULL AND p_media IS NULL THEN
    RETURN json_build_object('error', 'Message must contain text or media');
  END IF;
  
  -- Insert message (assuming messages table exists and links to conversations)
  INSERT INTO messages (sender_id, recipient_id, content, media_url, created_at)
  SELECT 
    auth.uid(),
    auth.uid(), -- Will be updated by trigger or separate logic
    p_text,
    (p_media->>'url')::text,
    now()
  RETURNING id INTO message_id;
  
  RETURN json_build_object('success', true, 'message_id', message_id);
END;
$$;

-- Database trigger to automatically enqueue safety scan when yearbooks are inserted
CREATE OR REPLACE FUNCTION yearbook_insert_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enqueue safety scan as specified in AC-ARCH-003
  INSERT INTO safety_queue (yearbook_id, status)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (yearbook_id) DO UPDATE SET
    status = 'pending',
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS yearbook_insert_trigger ON yearbooks;
CREATE TRIGGER yearbook_insert_trigger
  AFTER INSERT ON yearbooks
  FOR EACH ROW
  EXECUTE FUNCTION yearbook_insert_trigger();

-- Additional RPC functions for processing pipeline triggers
CREATE OR REPLACE FUNCTION trigger_ocr_processing(p_yearbook_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is called by safety scan worker to trigger OCR
  -- In production, this would enqueue for OCR processing
  -- For now, it just updates the status
  UPDATE yearbooks 
  SET status = 'processing_ocr', updated_at = now()
  WHERE id = p_yearbook_id;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_face_detection(p_yearbook_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is called by OCR worker to trigger face detection
  UPDATE yearbooks 
  SET status = 'processing_faces', updated_at = now()
  WHERE id = p_yearbook_id;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_tiling_process(p_yearbook_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is called by face detection worker to trigger tiling
  UPDATE yearbooks 
  SET status = 'processing_tiles', updated_at = now()
  WHERE id = p_yearbook_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION start_yearbook_processing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_claim(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_claim(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_claim(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_network_feed(timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_foryou_feed(timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION create_event(text, uuid, text, text, timestamptz, timestamptz, text, boolean, visibility, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION report_item(text, uuid, report_reason, text) TO authenticated;
GRANT EXECUTE ON FUNCTION send_message(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_ocr_processing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_face_detection(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_tiling_process(uuid) TO authenticated;