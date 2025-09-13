-- Priority 2 RPC Functions Migration
-- Database functions for Events, Businesses, Jobs, Mentorship, Messaging
-- Based on AC-ARCH-003 and AC-ARCH-004 specifications

-- =============================================
-- EVENTS RPC FUNCTIONS
-- =============================================

-- Create event with optional tickets
CREATE OR REPLACE FUNCTION public.create_event(
  p_title text,
  p_description text DEFAULT NULL,
  p_starts_at timestamptz,
  p_ends_at timestamptz DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_is_virtual boolean DEFAULT false,
  p_visibility visibility DEFAULT 'alumni_only',
  p_host_type text DEFAULT 'user',
  p_host_id uuid DEFAULT NULL,
  p_max_capacity int DEFAULT NULL,
  p_tickets jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_event jsonb;
  v_ticket jsonb;
  v_ticket_id uuid;
BEGIN
  -- Validate required fields
  IF p_title IS NULL OR p_starts_at IS NULL THEN
    RAISE EXCEPTION 'Title and start time are required';
  END IF;
  
  -- Set default host_id to current user if not provided
  IF p_host_id IS NULL THEN
    p_host_id := auth.uid();
  END IF;
  
  -- Insert event
  INSERT INTO public.events (
    title, description, starts_at, ends_at, location, is_virtual,
    visibility, host_type, host_id, max_capacity, created_by, ticketing_enabled
  ) VALUES (
    p_title, p_description, p_starts_at, p_ends_at, p_location, p_is_virtual,
    p_visibility, p_host_type, p_host_id, p_max_capacity, auth.uid(),
    CASE WHEN jsonb_array_length(p_tickets) > 0 THEN true ELSE false END
  ) RETURNING id INTO v_event_id;
  
  -- Insert tickets if provided
  FOR v_ticket IN SELECT * FROM jsonb_array_elements(p_tickets) LOOP
    INSERT INTO public.event_tickets (
      event_id, name, price_cents, currency, quantity, sales_start, sales_end
    ) VALUES (
      v_event_id,
      (v_ticket->>'name')::text,
      COALESCE((v_ticket->>'price_cents')::int, 0),
      COALESCE((v_ticket->>'currency')::text, 'USD'),
      (v_ticket->>'quantity')::int,
      (v_ticket->>'sales_start')::timestamptz,
      (v_ticket->>'sales_end')::timestamptz
    );
  END LOOP;
  
  -- Return event with tickets
  SELECT to_jsonb(e) || jsonb_build_object('tickets', 
    COALESCE((
      SELECT jsonb_agg(to_jsonb(t)) 
      FROM public.event_tickets t 
      WHERE t.event_id = e.id
    ), '[]'::jsonb)
  ) INTO v_event
  FROM public.events e 
  WHERE e.id = v_event_id;
  
  RETURN v_event;
END;
$$;

-- Get events with filtering
CREATE OR REPLACE FUNCTION public.get_events(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0,
  p_school_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_is_virtual boolean DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_events jsonb;
  v_total_count int;
BEGIN
  -- Get filtered events with pagination
  WITH filtered_events AS (
    SELECT e.*, 
           p.display_name as host_name,
           p.avatar_url as host_avatar,
           s.name as school_name,
           (
             SELECT jsonb_agg(jsonb_build_object(
               'id', t.id,
               'name', t.name,
               'price_cents', t.price_cents,
               'currency', t.currency,
               'quantity', t.quantity,
               'quantity_sold', t.quantity_sold
             ))
             FROM public.event_tickets t 
             WHERE t.event_id = e.id
           ) as tickets,
           (
             SELECT COUNT(*)
             FROM public.event_attendees ea 
             WHERE ea.event_id = e.id AND ea.status = 'registered'
           ) as attendee_count
    FROM public.events e
    LEFT JOIN public.profiles p ON p.id = e.created_by
    LEFT JOIN public.schools s ON s.id = e.host_id AND e.host_type = 'school'
    WHERE (p_school_id IS NULL OR (e.host_type = 'school' AND e.host_id = p_school_id))
      AND (p_start_date IS NULL OR e.starts_at >= p_start_date)
      AND (p_end_date IS NULL OR e.starts_at <= p_end_date)
      AND (p_location IS NULL OR e.location ILIKE '%' || p_location || '%')
      AND (p_is_virtual IS NULL OR e.is_virtual = p_is_virtual)
      AND e.starts_at > now() -- Only future events
    ORDER BY e.starts_at ASC
  )
  SELECT jsonb_build_object(
    'events', COALESCE(jsonb_agg(to_jsonb(fe)), '[]'::jsonb),
    'total_count', (SELECT COUNT(*) FROM filtered_events),
    'has_more', (SELECT COUNT(*) FROM filtered_events) > (p_offset + p_limit)
  ) INTO v_events
  FROM (
    SELECT * FROM filtered_events 
    LIMIT p_limit OFFSET p_offset
  ) fe;
  
  RETURN v_events;
END;
$$;

-- RSVP to event (free events)
CREATE OR REPLACE FUNCTION public.rsvp_to_event(
  p_event_id uuid,
  p_register boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_attendee_count int;
  v_max_capacity int;
BEGIN
  -- Check if event exists and is not ticketed
  SELECT max_capacity INTO v_max_capacity
  FROM public.events 
  WHERE id = p_event_id AND ticketing_enabled = false;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or requires ticket purchase';
  END IF;
  
  -- Check capacity if registering
  IF p_register THEN
    SELECT COUNT(*) INTO v_attendee_count
    FROM public.event_attendees
    WHERE event_id = p_event_id AND status = 'registered';
    
    IF v_max_capacity IS NOT NULL AND v_attendee_count >= v_max_capacity THEN
      RAISE EXCEPTION 'Event is at capacity';
    END IF;
    
    -- Insert or update attendee record
    INSERT INTO public.event_attendees (event_id, user_id, status)
    VALUES (p_event_id, auth.uid(), 'registered')
    ON CONFLICT (event_id, user_id) 
    DO UPDATE SET status = 'registered', registered_at = now();
    
    v_result := jsonb_build_object('status', 'registered');
  ELSE
    -- Remove RSVP
    DELETE FROM public.event_attendees
    WHERE event_id = p_event_id AND user_id = auth.uid();
    
    v_result := jsonb_build_object('status', 'unregistered');
  END IF;
  
  RETURN v_result;
END;
$$;

-- =============================================
-- BUSINESSES RPC FUNCTIONS
-- =============================================

-- Get businesses with filtering
CREATE OR REPLACE FUNCTION public.get_businesses(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0,
  p_category text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_verified_only boolean DEFAULT false,
  p_with_perks boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_businesses jsonb;
BEGIN
  WITH filtered_businesses AS (
    SELECT b.*,
           p.display_name as owner_name,
           p.avatar_url as owner_avatar
    FROM public.businesses b
    LEFT JOIN public.profiles p ON p.id = b.owner_id
    WHERE (p_category IS NULL OR b.category = p_category)
      AND (p_location IS NULL OR b.location ILIKE '%' || p_location || '%')
      AND (p_search IS NULL OR b.search @@ plainto_tsquery('simple', p_search))
      AND (NOT p_verified_only OR b.verified = true)
      AND (NOT p_with_perks OR b.perk IS NOT NULL)
    ORDER BY b.is_premium DESC, b.verified DESC, b.created_at DESC
  )
  SELECT jsonb_build_object(
    'businesses', COALESCE(jsonb_agg(to_jsonb(fb)), '[]'::jsonb),
    'total_count', (SELECT COUNT(*) FROM filtered_businesses),
    'has_more', (SELECT COUNT(*) FROM filtered_businesses) > (p_offset + p_limit)
  ) INTO v_businesses
  FROM (
    SELECT * FROM filtered_businesses 
    LIMIT p_limit OFFSET p_offset
  ) fb;
  
  RETURN v_businesses;
END;
$$;

-- Create business listing
CREATE OR REPLACE FUNCTION public.create_business(
  p_name text,
  p_description text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_perk text DEFAULT NULL,
  p_perk_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_id uuid;
  v_business jsonb;
BEGIN
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;
  
  INSERT INTO public.businesses (
    owner_id, name, description, category, website, location, perk, perk_url
  ) VALUES (
    auth.uid(), p_name, p_description, p_category, p_website, p_location, p_perk, p_perk_url
  ) RETURNING id INTO v_business_id;
  
  SELECT to_jsonb(b) INTO v_business
  FROM public.businesses b
  WHERE b.id = v_business_id;
  
  RETURN v_business;
END;
$$;

-- Claim business ownership
CREATE OR REPLACE FUNCTION public.claim_business(
  p_business_id uuid,
  p_evidence_type text,
  p_evidence_data jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim_id uuid;
BEGIN
  -- Check if business exists
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
    RAISE EXCEPTION 'Business not found';
  END IF;
  
  -- Insert claim
  INSERT INTO public.business_claims (
    business_id, user_id, evidence_type, evidence_data
  ) VALUES (
    p_business_id, auth.uid(), p_evidence_type, p_evidence_data
  ) RETURNING id INTO v_claim_id
  ON CONFLICT (business_id, user_id) 
  DO UPDATE SET 
    evidence_type = EXCLUDED.evidence_type,
    evidence_data = EXCLUDED.evidence_data,
    status = 'pending'
  RETURNING id INTO v_claim_id;
  
  RETURN jsonb_build_object('claim_id', v_claim_id, 'status', 'pending');
END;
$$;

-- =============================================
-- JOBS RPC FUNCTIONS
-- =============================================

-- Get jobs with filtering
CREATE OR REPLACE FUNCTION public.get_jobs(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0,
  p_location text DEFAULT NULL,
  p_remote boolean DEFAULT NULL,
  p_job_type text DEFAULT NULL,
  p_experience_level text DEFAULT NULL,
  p_search text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_jobs jsonb;
BEGIN
  WITH filtered_jobs AS (
    SELECT j.*,
           p.display_name as posted_by_name,
           p.avatar_url as posted_by_avatar,
           EXISTS(
             SELECT 1 FROM public.job_saves js 
             WHERE js.job_id = j.id AND js.user_id = auth.uid()
           ) as is_saved,
           EXISTS(
             SELECT 1 FROM public.job_applications ja 
             WHERE ja.job_id = j.id AND ja.user_id = auth.uid()
           ) as has_applied
    FROM public.jobs j
    LEFT JOIN public.profiles p ON p.id = j.posted_by
    WHERE (j.expires_at IS NULL OR j.expires_at > now())
      AND (p_location IS NULL OR j.location ILIKE '%' || p_location || '%')
      AND (p_remote IS NULL OR j.remote = p_remote)
      AND (p_job_type IS NULL OR j.job_type = p_job_type)
      AND (p_experience_level IS NULL OR j.experience_level = p_experience_level)
      AND (p_search IS NULL OR j.search @@ plainto_tsquery('simple', p_search))
    ORDER BY j.is_featured DESC, j.created_at DESC
  )
  SELECT jsonb_build_object(
    'jobs', COALESCE(jsonb_agg(to_jsonb(fj)), '[]'::jsonb),
    'total_count', (SELECT COUNT(*) FROM filtered_jobs),
    'has_more', (SELECT COUNT(*) FROM filtered_jobs) > (p_offset + p_limit)
  ) INTO v_jobs
  FROM (
    SELECT * FROM filtered_jobs 
    LIMIT p_limit OFFSET p_offset
  ) fj;
  
  RETURN v_jobs;
END;
$$;

-- Create job posting
CREATE OR REPLACE FUNCTION public.create_job(
  p_title text,
  p_company text,
  p_location text DEFAULT NULL,
  p_remote boolean DEFAULT false,
  p_job_type text DEFAULT 'full-time',
  p_experience_level text DEFAULT 'mid',
  p_description text,
  p_requirements text DEFAULT NULL,
  p_salary_min int DEFAULT NULL,
  p_salary_max int DEFAULT NULL,
  p_apply_url text DEFAULT NULL,
  p_apply_email text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id uuid;
  v_job jsonb;
BEGIN
  IF p_title IS NULL OR p_company IS NULL OR p_description IS NULL THEN
    RAISE EXCEPTION 'Title, company, and description are required';
  END IF;
  
  INSERT INTO public.jobs (
    posted_by, title, company, location, remote, job_type, experience_level,
    description, requirements, salary_min, salary_max, apply_url, apply_email,
    expires_at
  ) VALUES (
    auth.uid(), p_title, p_company, p_location, p_remote, p_job_type, p_experience_level,
    p_description, p_requirements, p_salary_min, p_salary_max, p_apply_url, p_apply_email,
    now() + interval '30 days' -- Default 30-day expiry
  ) RETURNING id INTO v_job_id;
  
  SELECT to_jsonb(j) INTO v_job
  FROM public.jobs j
  WHERE j.id = v_job_id;
  
  RETURN v_job;
END;
$$;

-- Apply to job
CREATE OR REPLACE FUNCTION public.apply_to_job(
  p_job_id uuid,
  p_cover_letter text DEFAULT NULL,
  p_resume_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if job exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = p_job_id AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Job not found or expired';
  END IF;
  
  -- Insert application
  INSERT INTO public.job_applications (
    job_id, user_id, cover_letter, resume_url
  ) VALUES (
    p_job_id, auth.uid(), p_cover_letter, p_resume_url
  )
  ON CONFLICT (job_id, user_id) DO NOTHING;
  
  RETURN jsonb_build_object('status', 'applied');
END;
$$;

-- Save/unsave job
CREATE OR REPLACE FUNCTION public.toggle_job_save(
  p_job_id uuid,
  p_save boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_save THEN
    INSERT INTO public.job_saves (job_id, user_id)
    VALUES (p_job_id, auth.uid())
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.job_saves
    WHERE job_id = p_job_id AND user_id = auth.uid();
  END IF;
  
  RETURN jsonb_build_object('saved', p_save);
END;
$$;

-- =============================================
-- MENTORSHIP RPC FUNCTIONS
-- =============================================

-- Get mentorship profiles with matching
CREATE OR REPLACE FUNCTION public.get_mentorship_matches(
  p_role text DEFAULT 'mentee', -- looking for mentors as mentee
  p_expertise_areas text[] DEFAULT '{}',
  p_industries text[] DEFAULT '{}',
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_role text;
  v_matches jsonb;
BEGIN
  -- Determine what role we're looking for
  v_target_role := CASE 
    WHEN p_role = 'mentee' THEN 'mentor'
    WHEN p_role = 'mentor' THEN 'mentee'
    ELSE 'both'
  END;
  
  WITH matched_profiles AS (
    SELECT mp.*,
           p.display_name,
           p.avatar_url,
           ue.school_id,
           s.name as school_name,
           -- Enhanced matching algorithm with multiple criteria
           (
             -- Expertise match (40% weight)
             CASE 
               WHEN array_length(p_expertise_areas, 1) > 0 AND array_length(mp.expertise_areas, 1) > 0 THEN
                 (SELECT COUNT(*) FROM unnest(p_expertise_areas) AS ea1 
                  WHERE ea1 = ANY(mp.expertise_areas)) * 40.0 / GREATEST(array_length(p_expertise_areas, 1), 1)
               ELSE 10
             END +
             -- Industry match (30% weight)
             CASE 
               WHEN array_length(p_industries, 1) > 0 AND array_length(mp.industries, 1) > 0 THEN
                 (SELECT COUNT(*) FROM unnest(p_industries) AS ind1 
                  WHERE ind1 = ANY(mp.industries)) * 30.0 / GREATEST(array_length(p_industries, 1), 1)
               ELSE 7
             END +
             -- School match (20% weight) - if same school
             CASE 
               WHEN EXISTS (
                 SELECT 1 FROM public.user_education ue1 
                 WHERE ue1.user_id = auth.uid() AND ue1.school_id = ue.school_id
               ) THEN 20
               ELSE 0
             END +
             -- Availability match (10% weight) - if overlapping availability
             CASE 
               WHEN mp.availability IS NOT NULL AND mp.availability != '{}'::jsonb THEN 10
               ELSE 0
             END
           ) as match_score
    FROM public.mentorship_profiles mp
    JOIN public.profiles p ON p.id = mp.user_id
    LEFT JOIN public.user_education ue ON ue.user_id = mp.user_id
    LEFT JOIN public.schools s ON s.id = ue.school_id
    WHERE mp.is_available = true
      AND mp.user_id != auth.uid()
      AND (mp.role = v_target_role OR mp.role = 'both')
      AND NOT EXISTS (
        SELECT 1 FROM public.mentorship_matches mm
        WHERE ((mm.mentor_id = mp.user_id AND mm.mentee_id = auth.uid()) OR
               (mm.mentor_id = auth.uid() AND mm.mentee_id = mp.user_id))
        AND mm.status IN ('suggested', 'accepted')
      )
    ORDER BY match_score DESC, mp.created_at DESC
  )
  SELECT jsonb_build_object(
    'matches', COALESCE(jsonb_agg(to_jsonb(mp)), '[]'::jsonb),
    'total_count', (SELECT COUNT(*) FROM matched_profiles),
    'has_more', (SELECT COUNT(*) FROM matched_profiles) > (p_offset + p_limit)
  ) INTO v_matches
  FROM (
    SELECT * FROM matched_profiles 
    LIMIT p_limit OFFSET p_offset
  ) mp;
  
  RETURN v_matches;
END;
$$;

-- Create or update mentorship profile
CREATE OR REPLACE FUNCTION public.upsert_mentorship_profile(
  p_role mentorship_role,
  p_bio text DEFAULT NULL,
  p_expertise_areas text[] DEFAULT '{}',
  p_industries text[] DEFAULT '{}',
  p_availability jsonb DEFAULT '{}'::jsonb,
  p_max_mentees int DEFAULT 3
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile jsonb;
BEGIN
  INSERT INTO public.mentorship_profiles (
    user_id, role, bio, expertise_areas, industries, availability, max_mentees
  ) VALUES (
    auth.uid(), p_role, p_bio, p_expertise_areas, p_industries, p_availability, p_max_mentees
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    role = EXCLUDED.role,
    bio = EXCLUDED.bio,
    expertise_areas = EXCLUDED.expertise_areas,
    industries = EXCLUDED.industries,
    availability = EXCLUDED.availability,
    max_mentees = EXCLUDED.max_mentees,
    updated_at = now();
  
  SELECT to_jsonb(mp) INTO v_profile
  FROM public.mentorship_profiles mp
  WHERE mp.user_id = auth.uid();
  
  RETURN v_profile;
END;
$$;

-- Request mentorship connection
CREATE OR REPLACE FUNCTION public.request_mentorship_match(
  p_target_user_id uuid,
  p_message text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match_id uuid;
  v_mentor_id uuid;
  v_mentee_id uuid;
BEGIN
  -- Determine mentor/mentee roles based on profiles
  SELECT 
    CASE 
      WHEN mp1.role IN ('mentor', 'both') AND mp2.role IN ('mentee', 'both') THEN p_target_user_id
      WHEN mp1.role IN ('mentee', 'both') AND mp2.role IN ('mentor', 'both') THEN auth.uid()
      ELSE NULL
    END,
    CASE 
      WHEN mp1.role IN ('mentor', 'both') AND mp2.role IN ('mentee', 'both') THEN auth.uid()
      WHEN mp1.role IN ('mentee', 'both') AND mp2.role IN ('mentor', 'both') THEN p_target_user_id
      ELSE NULL
    END
  INTO v_mentor_id, v_mentee_id
  FROM public.mentorship_profiles mp1, public.mentorship_profiles mp2
  WHERE mp1.user_id = auth.uid() AND mp2.user_id = p_target_user_id;
  
  IF v_mentor_id IS NULL OR v_mentee_id IS NULL THEN
    RAISE EXCEPTION 'Invalid mentorship pairing';
  END IF;
  
  INSERT INTO public.mentorship_matches (
    mentor_id, mentee_id, message
  ) VALUES (
    v_mentor_id, v_mentee_id, p_message
  ) RETURNING id INTO v_match_id;
  
  RETURN jsonb_build_object('match_id', v_match_id, 'status', 'suggested');
END;
$$;

-- =============================================
-- MESSAGING RPC FUNCTIONS
-- =============================================

-- Create conversation
CREATE OR REPLACE FUNCTION public.create_conversation(
  p_participant_ids uuid[],
  p_title text DEFAULT NULL,
  p_is_group boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
  v_participant_id uuid;
  v_conversation jsonb;
BEGIN
  -- Create conversation
  INSERT INTO public.conversations (created_by, is_group, title)
  VALUES (auth.uid(), p_is_group, p_title)
  RETURNING id INTO v_conversation_id;
  
  -- Add creator as owner
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (v_conversation_id, auth.uid(), 'owner');
  
  -- Add other participants
  FOREACH v_participant_id IN ARRAY p_participant_ids LOOP
    IF v_participant_id != auth.uid() THEN
      INSERT INTO public.conversation_members (conversation_id, user_id, role)
      VALUES (v_conversation_id, v_participant_id, 'member');
    END IF;
  END LOOP;
  
  -- Return conversation with members
  SELECT jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'is_group', c.is_group,
    'created_at', c.created_at,
    'members', (
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', cm.user_id,
        'role', cm.role,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ))
      FROM public.conversation_members cm
      JOIN public.profiles p ON p.id = cm.user_id
      WHERE cm.conversation_id = c.id AND cm.left_at IS NULL
    )
  ) INTO v_conversation
  FROM public.conversations c
  WHERE c.id = v_conversation_id;
  
  RETURN v_conversation;
END;
$$;

-- Send message
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id uuid,
  p_text text DEFAULT NULL,
  p_media jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message jsonb;
BEGIN
  -- Check if user is member of conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid() AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;
  
  -- Insert message
  INSERT INTO public.messages (conversation_id, sender_id, text, media)
  VALUES (p_conversation_id, auth.uid(), p_text, p_media)
  RETURNING to_jsonb(messages.*) INTO v_message;
  
  RETURN v_message;
END;
$$;

-- =============================================
-- MODERATION RPC FUNCTIONS
-- =============================================

-- Report content
CREATE OR REPLACE FUNCTION public.report_content(
  p_target_table text,
  p_target_id uuid,
  p_reason report_reason,
  p_details text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report_id uuid;
BEGIN
  INSERT INTO public.moderation_reports (
    reporter_id, target_table, target_id, reason, details
  ) VALUES (
    auth.uid(), p_target_table, p_target_id, p_reason, p_details
  ) RETURNING id INTO v_report_id;
  
  RETURN jsonb_build_object('report_id', v_report_id, 'status', 'submitted');
END;
$$;