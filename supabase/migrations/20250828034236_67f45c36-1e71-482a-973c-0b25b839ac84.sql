-- Multi-School Database Migration - Phase 2: Row Level Security Policies
-- Adding comprehensive RLS policies for all new multi-school tables

-- 1. School Districts Policies
CREATE POLICY "Public read access to school districts" 
ON public.school_districts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. School Partnerships Policies  
CREATE POLICY "Users can view partnerships for their schools" 
ON public.school_partnerships 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    school_1_id IN (
      SELECT school_id FROM public.school_history 
      WHERE user_id = auth.uid()
    )
    OR school_2_id IN (
      SELECT school_id FROM public.school_history 
      WHERE user_id = auth.uid()
    )
    OR school_1_id = public.get_current_user_school_id()
    OR school_2_id = public.get_current_user_school_id()
  )
);

CREATE POLICY "School administrators can manage partnerships" 
ON public.school_partnerships 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.school_administrators 
    WHERE user_id = auth.uid() 
    AND (school_id = school_1_id OR school_id = school_2_id)
    AND status = 'active'
    AND role IN ('principal', 'vice_principal', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.school_administrators 
    WHERE user_id = auth.uid() 
    AND (school_id = school_1_id OR school_id = school_2_id)
    AND status = 'active'
    AND role IN ('principal', 'vice_principal', 'admin')
  )
);

-- 3. School Administrators Policies
CREATE POLICY "Users can view administrators for their schools" 
ON public.school_administrators 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    school_id IN (
      SELECT school_id FROM public.school_history 
      WHERE user_id = auth.uid()
    )
    OR school_id = public.get_current_user_school_id()
    OR user_id = auth.uid()
  )
);

CREATE POLICY "School administrators can manage their schools" 
ON public.school_administrators 
FOR ALL 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.school_administrators sa
    WHERE sa.user_id = auth.uid() 
    AND sa.school_id = school_administrators.school_id
    AND sa.status = 'active'
    AND sa.role IN ('principal', 'vice_principal', 'admin')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.school_administrators sa
    WHERE sa.user_id = auth.uid() 
    AND sa.school_id = school_administrators.school_id
    AND sa.status = 'active'
    AND sa.role IN ('principal', 'vice_principal', 'admin')
  )
);

-- 4. School History Policies
CREATE POLICY "Users can manage their own school history" 
ON public.school_history 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view school history for connected users" 
ON public.school_history 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR user_id IN (
    SELECT
      CASE
        WHEN friendships.requester_id = auth.uid() THEN friendships.addressee_id
        WHEN friendships.addressee_id = auth.uid() THEN friendships.requester_id
        ELSE NULL::uuid
      END
    FROM friendships
    WHERE friendships.status = 'accepted'
      AND (friendships.requester_id = auth.uid() OR friendships.addressee_id = auth.uid())
  )
);

-- 5. School Verifications Policies
CREATE POLICY "Users can manage their own verifications" 
ON public.school_verifications 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "School administrators can verify users" 
ON public.school_verifications 
FOR ALL 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.school_administrators 
    WHERE user_id = auth.uid() 
    AND school_id = school_verifications.school_id
    AND status = 'active'
    AND role IN ('principal', 'vice_principal', 'admin', 'teacher')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.school_administrators 
    WHERE user_id = auth.uid() 
    AND school_id = school_verifications.school_id
    AND status = 'active'
    AND role IN ('principal', 'vice_principal', 'admin', 'teacher')
  )
);

-- 6. Cross School Events Policies
CREATE POLICY "Users can view events for their schools" 
ON public.cross_school_events 
FOR SELECT 
USING (
  visibility = 'public'
  OR created_by = auth.uid()
  OR organizer_school_id IN (
    SELECT school_id FROM public.school_history 
    WHERE user_id = auth.uid()
  )
  OR organizer_school_id = public.get_current_user_school_id()
  OR auth.uid()::text = ANY(
    SELECT unnest(participating_schools)::text
  )
);

CREATE POLICY "Users can create events for their schools" 
ON public.cross_school_events 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid()
  AND (
    organizer_school_id IN (
      SELECT school_id FROM public.school_history 
      WHERE user_id = auth.uid()
    )
    OR organizer_school_id = public.get_current_user_school_id()
    OR EXISTS (
      SELECT 1 FROM public.school_administrators 
      WHERE user_id = auth.uid() 
      AND school_id = organizer_school_id
      AND status = 'active'
    )
  )
);

CREATE POLICY "Users can update their own events" 
ON public.cross_school_events 
FOR UPDATE 
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.school_administrators 
    WHERE user_id = auth.uid() 
    AND school_id = organizer_school_id
    AND status = 'active'
    AND role IN ('principal', 'vice_principal', 'admin')
  )
);

-- 7. School Invitations Policies
CREATE POLICY "Users can view invitations for their schools" 
ON public.school_invitations 
FOR SELECT 
USING (
  invited_by = auth.uid()
  OR responded_by = auth.uid()
  OR from_school_id IN (
    SELECT school_id FROM public.school_history 
    WHERE user_id = auth.uid()
  )
  OR to_school_id IN (
    SELECT school_id FROM public.school_history 
    WHERE user_id = auth.uid()
  )
  OR from_school_id = public.get_current_user_school_id()
  OR to_school_id = public.get_current_user_school_id()
  OR EXISTS (
    SELECT 1 FROM public.school_administrators 
    WHERE user_id = auth.uid() 
    AND (school_id = from_school_id OR school_id = to_school_id)
    AND status = 'active'
  )
);

CREATE POLICY "School administrators can manage invitations" 
ON public.school_invitations 
FOR ALL 
USING (
  invited_by = auth.uid()
  OR responded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.school_administrators 
    WHERE user_id = auth.uid() 
    AND (school_id = from_school_id OR school_id = to_school_id)
    AND status = 'active'
    AND role IN ('principal', 'vice_principal', 'admin')
  )
)
WITH CHECK (
  invited_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.school_administrators 
    WHERE user_id = auth.uid() 
    AND school_id = from_school_id
    AND status = 'active'
    AND role IN ('principal', 'vice_principal', 'admin')
  )
);