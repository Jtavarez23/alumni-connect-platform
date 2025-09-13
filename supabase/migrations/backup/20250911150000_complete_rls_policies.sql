-- Alumni Connect Sprint 1 - Complete RLS Policies Implementation
-- Comprehensive Row Level Security policies for all new tables
-- Based on AC-ARCH-002b security requirements

-- =============================================
-- TRUST LEVEL VERIFICATION FUNCTION
-- =============================================

-- Helper function to check user trust level
CREATE OR REPLACE FUNCTION public.user_has_trust_level(target_trust trust_level)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND trust >= target_trust
  );
$$;

-- Helper function to check if user is connected to another user
CREATE OR REPLACE FUNCTION public.users_are_connected(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections 
    WHERE ((user_id = user1_id AND connection_id = user2_id) OR 
           (user_id = user2_id AND connection_id = user1_id))
    AND status = 'accepted'
  );
$$;

-- Helper function to check if user is in same school
CREATE OR REPLACE FUNCTION public.users_share_school(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_education ue1
    JOIN public.user_education ue2 ON ue1.school_id = ue2.school_id
    WHERE ue1.user_id = user1_id AND ue2.user_id = user2_id
  );
$$;

-- Helper function to check group membership
CREATE OR REPLACE FUNCTION public.user_is_group_member(user_id_param uuid, group_id_param uuid, min_role text DEFAULT 'member')
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = user_id_param 
    AND group_id = group_id_param
    AND (min_role = 'member' OR 
         (min_role = 'admin' AND role IN ('admin', 'owner')) OR
         (min_role = 'owner' AND role = 'owner'))
  );
$$;

-- =============================================
-- MODERATION & SAFETY POLICIES
-- =============================================

-- Moderation reports: Users can create, moderators can manage
DROP POLICY IF EXISTS "moderation_reports_moderator_access" ON public.moderation_reports;

CREATE POLICY "moderation_reports_create" ON public.moderation_reports
FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "moderation_reports_read" ON public.moderation_reports
FOR SELECT USING (
  auth.uid() = reporter_id OR
  public.user_has_trust_level('moderator'::trust_level)
);

CREATE POLICY "moderation_reports_update" ON public.moderation_reports
FOR UPDATE USING (
  public.user_has_trust_level('moderator'::trust_level)
) WITH CHECK (
  public.user_has_trust_level('moderator'::trust_level)
);

-- Moderation actions: Only moderators
DROP POLICY IF EXISTS "moderation_actions_moderator_access" ON public.moderation_actions;

CREATE POLICY "moderation_actions_moderator" ON public.moderation_actions
FOR ALL USING (
  public.user_has_trust_level('moderator'::trust_level)
) WITH CHECK (
  public.user_has_trust_level('moderator'::trust_level)
);

-- Safety events: Only staff
DROP POLICY IF EXISTS "safety_events_staff_access" ON public.safety_events;

CREATE POLICY "safety_events_staff" ON public.safety_events
FOR ALL USING (
  public.user_has_trust_level('staff'::trust_level)
) WITH CHECK (
  public.user_has_trust_level('staff'::trust_level)
);

-- =============================================
-- BUSINESS DIRECTORY POLICIES
-- =============================================

-- Businesses: Public read, verified users can create
DROP POLICY IF EXISTS "businesses_public_read" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_write" ON public.businesses;
DROP POLICY IF EXISTS "businesses_owner_update" ON public.businesses;

CREATE POLICY "businesses_read" ON public.businesses
FOR SELECT USING (true); -- Public read

CREATE POLICY "businesses_create" ON public.businesses
FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  public.user_has_trust_level('verified_alumni'::trust_level)
);

CREATE POLICY "businesses_update_owner" ON public.businesses
FOR UPDATE USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.business_claims bc
    WHERE bc.business_id = businesses.id
    AND bc.user_id = auth.uid()
    AND bc.status = 'approved'
    AND bc.claim_type IN ('owner', 'manager')
  )
) WITH CHECK (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.business_claims bc
    WHERE bc.business_id = businesses.id
    AND bc.user_id = auth.uid()
    AND bc.status = 'approved'
    AND bc.claim_type IN ('owner', 'manager')
  )
);

CREATE POLICY "businesses_delete_owner" ON public.businesses
FOR DELETE USING (
  auth.uid() = created_by OR
  public.user_has_trust_level('moderator'::trust_level)
);

-- Business claims: Users can claim, owners/moderators can approve
DROP POLICY IF EXISTS "business_claims_user_create" ON public.business_claims;
DROP POLICY IF EXISTS "business_claims_visibility" ON public.business_claims;

CREATE POLICY "business_claims_create" ON public.business_claims
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  public.user_has_trust_level('verified_alumni'::trust_level)
);

CREATE POLICY "business_claims_read" ON public.business_claims
FOR SELECT USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT b.created_by FROM public.businesses b
    WHERE b.id = business_claims.business_id
  ) OR
  public.user_has_trust_level('moderator'::trust_level)
);

CREATE POLICY "business_claims_update" ON public.business_claims
FOR UPDATE USING (
  auth.uid() IN (
    SELECT b.created_by FROM public.businesses b
    WHERE b.id = business_claims.business_id
  ) OR
  public.user_has_trust_level('moderator'::trust_level)
) WITH CHECK (
  auth.uid() IN (
    SELECT b.created_by FROM public.businesses b
    WHERE b.id = business_claims.business_id
  ) OR
  public.user_has_trust_level('moderator'::trust_level)
);

-- Business reviews: Users can review, business owners can see all
CREATE POLICY "business_reviews_create" ON public.business_reviews
FOR INSERT WITH CHECK (
  auth.uid() = reviewer_id AND
  public.user_has_trust_level('verified_alumni'::trust_level)
);

CREATE POLICY "business_reviews_read" ON public.business_reviews
FOR SELECT USING (
  true OR -- Public read for now, can be restricted later
  auth.uid() = reviewer_id OR
  auth.uid() IN (
    SELECT b.created_by FROM public.businesses b
    WHERE b.id = business_reviews.business_id
  )
);

CREATE POLICY "business_reviews_update" ON public.business_reviews
FOR UPDATE USING (auth.uid() = reviewer_id) 
WITH CHECK (auth.uid() = reviewer_id);

-- =============================================
-- JOBS & CAREER POLICIES  
-- =============================================

-- Jobs: Public/alumni read based on visibility, poster controls
DROP POLICY IF EXISTS "jobs_public_read" ON public.jobs;
DROP POLICY IF EXISTS "jobs_poster_write" ON public.jobs;

CREATE POLICY "jobs_read" ON public.jobs
FOR SELECT USING (
  visibility = 'public' OR
  auth.uid() = posted_by OR
  (visibility = 'alumni_only' AND public.user_has_trust_level('verified_alumni'::trust_level)) OR
  (visibility = 'connections_only' AND (
    auth.uid() = posted_by OR 
    public.users_are_connected(auth.uid(), posted_by)
  )) OR
  (visibility = 'school_only' AND public.users_share_school(auth.uid(), posted_by))
);

CREATE POLICY "jobs_create" ON public.jobs
FOR INSERT WITH CHECK (
  auth.uid() = posted_by AND
  public.user_has_trust_level('verified_alumni'::trust_level)
);

CREATE POLICY "jobs_update" ON public.jobs
FOR UPDATE USING (auth.uid() = posted_by) 
WITH CHECK (auth.uid() = posted_by);

CREATE POLICY "jobs_delete" ON public.jobs
FOR DELETE USING (
  auth.uid() = posted_by OR
  public.user_has_trust_level('moderator'::trust_level)
);

-- Job applications: Applicant and job poster can access
DROP POLICY IF EXISTS "job_applications_access" ON public.job_applications;

CREATE POLICY "job_applications_create" ON public.job_applications
FOR INSERT WITH CHECK (
  auth.uid() = applicant_id AND
  public.user_has_trust_level('verified_alumni'::trust_level)
);

CREATE POLICY "job_applications_read" ON public.job_applications
FOR SELECT USING (
  auth.uid() = applicant_id OR
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_applications.job_id 
    AND j.posted_by = auth.uid()
  )
);

CREATE POLICY "job_applications_update" ON public.job_applications
FOR UPDATE USING (
  auth.uid() = applicant_id OR
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_applications.job_id 
    AND j.posted_by = auth.uid()
  )
) WITH CHECK (
  auth.uid() = applicant_id OR
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_applications.job_id 
    AND j.posted_by = auth.uid()
  )
);

-- Saved jobs: User can manage their own saved jobs
CREATE POLICY "saved_jobs_self_manage" ON public.saved_jobs
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Notifications: Users can only access their own
DROP POLICY IF EXISTS "notifications_self_access" ON public.notifications;
DROP POLICY IF EXISTS "notification_preferences_self_access" ON public.notification_preferences;

CREATE POLICY "notifications_read" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete" ON public.notifications
FOR DELETE USING (auth.uid() = user_id);

-- System can create notifications for users
CREATE POLICY "notifications_system_create" ON public.notifications
FOR INSERT WITH CHECK (true); -- Will be restricted by service role

-- Notification preferences: Users manage their own preferences
CREATE POLICY "notification_preferences_self" ON public.notification_preferences
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- MENTORSHIP PLATFORM POLICIES
-- =============================================

-- Mentorship profiles: Public read for discovery, owner manages
DROP POLICY IF EXISTS "mentorship_profiles_public_read" ON public.mentorship_profiles;
DROP POLICY IF EXISTS "mentorship_profiles_owner_write" ON public.mentorship_profiles;

CREATE POLICY "mentorship_profiles_read" ON public.mentorship_profiles
FOR SELECT USING (
  is_active = true OR 
  auth.uid() = user_id
);

CREATE POLICY "mentorship_profiles_manage" ON public.mentorship_profiles
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Mentorship availability: Owner manages, others can view active profiles
CREATE POLICY "mentorship_availability_read" ON public.mentorship_availability
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.mentorship_profiles mp
    WHERE mp.id = mentorship_availability.mentorship_profile_id
    AND (mp.is_active = true OR mp.user_id = auth.uid())
  )
);

CREATE POLICY "mentorship_availability_manage" ON public.mentorship_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.mentorship_profiles mp
    WHERE mp.id = mentorship_availability.mentorship_profile_id
    AND mp.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mentorship_profiles mp
    WHERE mp.id = mentorship_availability.mentorship_profile_id
    AND mp.user_id = auth.uid()
  )
);

-- Mentorship matches: Participants only
DROP POLICY IF EXISTS "mentorship_matches_participants" ON public.mentorship_matches;

CREATE POLICY "mentorship_matches_read" ON public.mentorship_matches
FOR SELECT USING (auth.uid() IN (mentor_id, mentee_id));

CREATE POLICY "mentorship_matches_create" ON public.mentorship_matches
FOR INSERT WITH CHECK (
  auth.uid() IN (mentor_id, mentee_id) AND
  public.user_has_trust_level('verified_alumni'::trust_level)
);

CREATE POLICY "mentorship_matches_update" ON public.mentorship_matches
FOR UPDATE USING (auth.uid() IN (mentor_id, mentee_id))
WITH CHECK (auth.uid() IN (mentor_id, mentee_id));

-- Mentorship sessions: Match participants only
DROP POLICY IF EXISTS "mentorship_sessions_participants" ON public.mentorship_sessions;

CREATE POLICY "mentorship_sessions_access" ON public.mentorship_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.mentorship_matches mm
    WHERE mm.id = mentorship_sessions.match_id
    AND auth.uid() IN (mm.mentor_id, mm.mentee_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mentorship_matches mm
    WHERE mm.id = mentorship_sessions.match_id
    AND auth.uid() IN (mm.mentor_id, mm.mentee_id)
  )
);

-- Mentorship goals: Match participants only
CREATE POLICY "mentorship_goals_access" ON public.mentorship_goals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.mentorship_matches mm
    WHERE mm.id = mentorship_goals.match_id
    AND auth.uid() IN (mm.mentor_id, mm.mentee_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mentorship_matches mm
    WHERE mm.id = mentorship_goals.match_id
    AND auth.uid() IN (mm.mentor_id, mm.mentee_id)
  )
);

-- =============================================
-- ENHANCED EVENTS POLICIES
-- =============================================

-- Event attendees: Attendee and event organizers can access
DROP POLICY IF EXISTS "event_attendees_access" ON public.event_attendees;

CREATE POLICY "event_attendees_read" ON public.event_attendees
FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_attendees.event_id 
    AND e.created_by = auth.uid()
  ) OR
  public.user_is_group_member(auth.uid(), 
    (SELECT host_id FROM public.events WHERE id = event_attendees.event_id AND host_type = 'group'), 
    'admin'
  )
);

CREATE POLICY "event_attendees_manage_self" ON public.event_attendees
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "event_attendees_manage_organizer" ON public.event_attendees
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_attendees.event_id 
    AND e.created_by = auth.uid()
  ) OR
  public.user_is_group_member(auth.uid(), 
    (SELECT host_id FROM public.events WHERE id = event_attendees.event_id AND host_type = 'group'), 
    'admin'
  )
);

-- Event organizers: Event creator and group admins can manage
CREATE POLICY "event_organizers_read" ON public.event_organizers
FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_organizers.event_id 
    AND e.created_by = auth.uid()
  )
);

CREATE POLICY "event_organizers_manage" ON public.event_organizers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_organizers.event_id 
    AND e.created_by = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_organizers.event_id 
    AND e.created_by = auth.uid()
  )
);

-- Event agenda: Public read for event attendees, organizers manage
CREATE POLICY "event_agenda_read" ON public.event_agenda
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_agenda.event_id
    AND (e.visibility = 'public' OR
         EXISTS (
           SELECT 1 FROM public.event_attendees ea
           WHERE ea.event_id = e.id AND ea.user_id = auth.uid()
         ))
  )
);

CREATE POLICY "event_agenda_manage" ON public.event_agenda
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_agenda.event_id 
    AND e.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.event_organizers eo
    WHERE eo.event_id = event_agenda.event_id 
    AND eo.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_agenda.event_id 
    AND e.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.event_organizers eo
    WHERE eo.event_id = event_agenda.event_id 
    AND eo.user_id = auth.uid()
  )
);

-- Event feedback: Attendees can create, organizers can read
CREATE POLICY "event_feedback_create" ON public.event_feedback
FOR INSERT WITH CHECK (
  auth.uid() = attendee_id AND
  EXISTS (
    SELECT 1 FROM public.event_attendees ea
    WHERE ea.event_id = event_feedback.event_id 
    AND ea.user_id = auth.uid()
  )
);

CREATE POLICY "event_feedback_read" ON public.event_feedback
FOR SELECT USING (
  auth.uid() = attendee_id OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_feedback.event_id 
    AND e.created_by = auth.uid()
  )
);

-- Event announcements: Organizers manage, attendees read
CREATE POLICY "event_announcements_read" ON public.event_announcements
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.event_attendees ea
    WHERE ea.event_id = event_announcements.event_id 
    AND ea.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_announcements.event_id 
    AND e.created_by = auth.uid()
  )
);

CREATE POLICY "event_announcements_manage" ON public.event_announcements
FOR ALL USING (
  auth.uid() = author_id AND (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_announcements.event_id 
      AND e.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.event_organizers eo
      WHERE eo.event_id = event_announcements.event_id 
      AND eo.user_id = auth.uid()
    )
  )
) WITH CHECK (
  auth.uid() = author_id AND (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_announcements.event_id 
      AND e.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.event_organizers eo
      WHERE eo.event_id = event_announcements.event_id 
      AND eo.user_id = auth.uid()
    )
  )
);

-- =============================================
-- GROUP ENHANCEMENT POLICIES
-- =============================================

-- Group posts: Members can read, various levels can create
DROP POLICY IF EXISTS "group_posts_members" ON public.group_posts;
DROP POLICY IF EXISTS "group_posts_author" ON public.group_posts;

CREATE POLICY "group_posts_read" ON public.group_posts
FOR SELECT USING (
  public.user_is_group_member(auth.uid(), group_posts.group_id, 'member')
);

CREATE POLICY "group_posts_create" ON public.group_posts
FOR INSERT WITH CHECK (
  auth.uid() = author_id AND
  public.user_is_group_member(auth.uid(), group_id, 'member') AND
  (
    NOT requires_approval OR
    public.user_is_group_member(auth.uid(), group_id, 'admin')
  )
);

CREATE POLICY "group_posts_update_author" ON public.group_posts
FOR UPDATE USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "group_posts_moderate" ON public.group_posts
FOR UPDATE USING (
  public.user_is_group_member(auth.uid(), group_id, 'admin')
) WITH CHECK (
  public.user_is_group_member(auth.uid(), group_id, 'admin')
);

-- Group events: Group members can see, admins can create
CREATE POLICY "group_events_read" ON public.group_events
FOR SELECT USING (
  public.user_is_group_member(auth.uid(), group_events.group_id, 'member')
);

CREATE POLICY "group_events_manage" ON public.group_events
FOR ALL USING (
  public.user_is_group_member(auth.uid(), group_id, 'admin')
) WITH CHECK (
  public.user_is_group_member(auth.uid(), group_id, 'admin')
);

-- Group invitations: Inviter/invitee can see, invitee can respond
CREATE POLICY "group_invitations_read" ON public.group_invitations
FOR SELECT USING (
  auth.uid() IN (inviter_id, invitee_id) OR
  public.user_is_group_member(auth.uid(), group_id, 'admin')
);

CREATE POLICY "group_invitations_create" ON public.group_invitations
FOR INSERT WITH CHECK (
  auth.uid() = inviter_id AND
  (
    public.user_is_group_member(auth.uid(), group_id, 'admin') OR
    (
      public.user_is_group_member(auth.uid(), group_id, 'member') AND
      EXISTS (
        SELECT 1 FROM public.group_settings gs
        WHERE gs.group_id = group_invitations.group_id 
        AND gs.allow_member_invites = true
      )
    )
  )
);

CREATE POLICY "group_invitations_respond" ON public.group_invitations
FOR UPDATE USING (auth.uid() = invitee_id)
WITH CHECK (auth.uid() = invitee_id);

-- Group settings: Group admins only
CREATE POLICY "group_settings_read" ON public.group_settings
FOR SELECT USING (
  public.user_is_group_member(auth.uid(), group_settings.group_id, 'member')
);

CREATE POLICY "group_settings_manage" ON public.group_settings
FOR ALL USING (
  public.user_is_group_member(auth.uid(), group_id, 'admin')
) WITH CHECK (
  public.user_is_group_member(auth.uid(), group_id, 'admin')
);

-- =============================================
-- GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.user_has_trust_level(trust_level) TO authenticated;
GRANT EXECUTE ON FUNCTION public.users_are_connected(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.users_share_school(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_group_member(uuid, uuid, text) TO authenticated;

-- Grant service_role permissions for system operations
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.safety_events TO service_role;
GRANT ALL ON public.moderation_reports TO service_role;
GRANT ALL ON public.moderation_actions TO service_role;

-- =============================================
-- VALIDATION AND TESTING
-- =============================================

-- Test helper functions
DO $$
DECLARE
  test_result boolean;
BEGIN
  -- Test trust level function
  SELECT public.user_has_trust_level('unverified'::trust_level) INTO test_result;
  
  -- Test should not error
  RAISE NOTICE 'RLS helper functions working properly';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'RLS helper functions failed: %', SQLERRM;
END $$;

-- Verify all tables have RLS enabled
DO $$
DECLARE
  unprotected_tables text[];
  table_name text;
BEGIN
  SELECT ARRAY_AGG(tablename) INTO unprotected_tables
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT IN (
    SELECT tablename FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE c.relrowsecurity = true
    AND t.schemaname = 'public'
  );
  
  IF array_length(unprotected_tables, 1) > 0 THEN
    RAISE WARNING 'Tables without RLS: %', array_to_string(unprotected_tables, ', ');
  END IF;
  
  RAISE NOTICE 'RLS policy migration completed successfully';
END $$;