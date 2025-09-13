-- Priority 2 RLS Policies Migration
-- Row Level Security policies for Events, Businesses, Jobs, Mentorship, Messaging, Moderation
-- Based on AC-ARCH-002b specifications

-- =============================================
-- EVENTS RLS POLICIES
-- =============================================

-- Events: Read based on visibility and school membership
CREATE POLICY events_read ON public.events FOR SELECT USING (
  visibility = 'public' OR
  created_by = auth.uid() OR
  (visibility IN ('alumni_only', 'school_only') AND EXISTS (
    SELECT 1 FROM public.user_education ue 
    JOIN public.events e ON e.host_id = ue.school_id
    WHERE ue.user_id = auth.uid() 
    AND e.id = events.id 
    AND e.host_type = 'school'
  )) OR
  (visibility = 'connections_only' AND EXISTS (
    SELECT 1 FROM public.connections c 
    WHERE ((c.user_id = created_by AND c.connection_id = auth.uid()) OR
           (c.user_id = auth.uid() AND c.connection_id = created_by))
    AND c.status = 'accepted'
  ))
);

-- Events: Insert/Update/Delete by creator or admins
CREATE POLICY events_write ON public.events FOR ALL USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('school_admin', 'moderator', 'staff'))
) WITH CHECK (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('school_admin', 'moderator', 'staff'))
);

-- Event tickets: Read if can read event
CREATE POLICY event_tickets_read ON public.event_tickets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_tickets.event_id 
    AND (
      e.visibility = 'public' OR
      e.created_by = auth.uid() OR
      (e.visibility IN ('alumni_only', 'school_only') AND EXISTS (
        SELECT 1 FROM public.user_education ue 
        WHERE ue.user_id = auth.uid() AND ue.school_id = e.host_id AND e.host_type = 'school'
      ))
    )
  )
);

-- Event tickets: Write by event creator
CREATE POLICY event_tickets_write ON public.event_tickets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_tickets.event_id AND e.created_by = auth.uid()
  )
);

-- Event orders: Read own orders or event creator can see all
CREATE POLICY event_orders_read ON public.event_orders FOR SELECT USING (
  purchaser_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_orders.event_id AND e.created_by = auth.uid()
  )
);

-- Event orders: Insert own orders only
CREATE POLICY event_orders_insert ON public.event_orders FOR INSERT WITH CHECK (
  purchaser_id = auth.uid()
);

-- Event attendees: Read if can read event
CREATE POLICY event_attendees_read ON public.event_attendees FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_attendees.event_id AND e.created_by = auth.uid()
  )
);

-- =============================================
-- BUSINESSES RLS POLICIES  
-- =============================================

-- Businesses: Public read for discovery
CREATE POLICY businesses_read ON public.businesses FOR SELECT USING (true);

-- Businesses: Insert by any authenticated user
CREATE POLICY businesses_insert ON public.businesses FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Businesses: Update by owner or admins
CREATE POLICY businesses_update ON public.businesses FOR UPDATE USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- Business claims: Read own claims or business owner
CREATE POLICY business_claims_read ON public.business_claims FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = business_claims.business_id AND b.owner_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- Business claims: Insert own claims
CREATE POLICY business_claims_insert ON public.business_claims FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- =============================================
-- JOBS RLS POLICIES
-- =============================================

-- Jobs: Read based on visibility 
CREATE POLICY jobs_read ON public.jobs FOR SELECT USING (
  visibility = 'public' OR
  posted_by = auth.uid() OR
  (visibility IN ('alumni_only', 'school_only') AND EXISTS (
    SELECT 1 FROM public.user_education ue 
    WHERE ue.user_id = auth.uid()
  ))
);

-- Jobs: Write by poster or admins
CREATE POLICY jobs_write ON public.jobs FOR ALL USING (
  posted_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
) WITH CHECK (
  posted_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- Job applications: Read own applications or job poster
CREATE POLICY job_applications_read ON public.job_applications FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.jobs j 
    WHERE j.id = job_applications.job_id AND j.posted_by = auth.uid()
  )
);

-- Job applications: Insert own applications
CREATE POLICY job_applications_write ON public.job_applications FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- Job saves: Own saves only
CREATE POLICY job_saves_all ON public.job_saves FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- =============================================
-- MENTORSHIP RLS POLICIES
-- =============================================

-- Mentorship profiles: Public read for matching
CREATE POLICY mentorship_profiles_read ON public.mentorship_profiles FOR SELECT USING (
  is_available = true OR user_id = auth.uid()
);

-- Mentorship profiles: Own profile only
CREATE POLICY mentorship_profiles_write ON public.mentorship_profiles FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- Mentorship matches: Involved parties only
CREATE POLICY mentorship_matches_read ON public.mentorship_matches FOR SELECT USING (
  mentor_id = auth.uid() OR mentee_id = auth.uid()
);

-- Mentorship matches: System creates, parties can update
CREATE POLICY mentorship_matches_insert ON public.mentorship_matches FOR INSERT WITH CHECK (
  mentor_id = auth.uid() OR mentee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('staff'))
);

CREATE POLICY mentorship_matches_update ON public.mentorship_matches FOR UPDATE USING (
  mentor_id = auth.uid() OR mentee_id = auth.uid()
);

-- =============================================
-- MESSAGING RLS POLICIES
-- =============================================

-- Conversations: Members only
CREATE POLICY conversations_read ON public.conversations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members cm 
    WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid() AND cm.left_at IS NULL
  )
);

-- Conversations: Any authenticated user can create
CREATE POLICY conversations_insert ON public.conversations FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

-- Conversation members: Self and conversation admin management
CREATE POLICY conversation_members_read ON public.conversation_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_members cm2 
    WHERE cm2.conversation_id = conversation_members.conversation_id 
    AND cm2.user_id = auth.uid() 
    AND cm2.role IN ('owner', 'admin')
    AND cm2.left_at IS NULL
  )
);

CREATE POLICY conversation_members_write ON public.conversation_members FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_members cm 
    WHERE cm.conversation_id = conversation_members.conversation_id 
    AND cm.user_id = auth.uid() 
    AND cm.role IN ('owner', 'admin')
    AND cm.left_at IS NULL
  )
) WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_members cm 
    WHERE cm.conversation_id = conversation_members.conversation_id 
    AND cm.user_id = auth.uid() 
    AND cm.role IN ('owner', 'admin')
    AND cm.left_at IS NULL
  )
);

-- Messages: Conversation members only
CREATE POLICY messages_read ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_members cm 
    WHERE cm.conversation_id = messages.conversation_id 
    AND cm.user_id = auth.uid() 
    AND cm.left_at IS NULL
  )
);

CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_members cm 
    WHERE cm.conversation_id = messages.conversation_id 
    AND cm.user_id = auth.uid() 
    AND cm.left_at IS NULL
  )
);

-- Messages: Only sender can update (for editing)
CREATE POLICY messages_update ON public.messages FOR UPDATE USING (
  sender_id = auth.uid()
);

-- =============================================
-- MODERATION RLS POLICIES
-- =============================================

-- Moderation reports: Reporter and moderators
CREATE POLICY moderation_reports_read ON public.moderation_reports FOR SELECT USING (
  reporter_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- Anyone can create reports
CREATE POLICY moderation_reports_insert ON public.moderation_reports FOR INSERT WITH CHECK (
  reporter_id = auth.uid()
);

-- Only moderators can update reports
CREATE POLICY moderation_reports_update ON public.moderation_reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- Moderation actions: Moderators only
CREATE POLICY moderation_actions_read ON public.moderation_actions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

CREATE POLICY moderation_actions_insert ON public.moderation_actions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff')) AND
  moderator_id = auth.uid()
);

-- =============================================
-- YEARBOOK CLAIMS RLS POLICIES
-- =============================================

-- Face claims: Own claims and moderators
CREATE POLICY yearbook_face_claims_read ON public.yearbook_face_claims FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff', 'school_admin'))
);

CREATE POLICY yearbook_face_claims_write ON public.yearbook_face_claims FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff', 'school_admin'))
) WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff', 'school_admin'))
);

-- Name claims: Own claims and moderators
CREATE POLICY yearbook_name_claims_read ON public.yearbook_name_claims FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff', 'school_admin'))
);

CREATE POLICY yearbook_name_claims_write ON public.yearbook_name_claims FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff', 'school_admin'))
) WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff', 'school_admin'))
);