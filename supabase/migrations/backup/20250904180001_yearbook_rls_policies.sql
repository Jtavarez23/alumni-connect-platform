-- Alumni Connect - RLS Policies for Yearbook Processing Pipeline
-- Implements row-level security policies as specified in AC-ARCH-002b

-- Yearbooks policies
CREATE POLICY "yearbooks_read" ON public.yearbooks FOR SELECT USING (
  visibility = 'public' OR
  uploaded_by = auth.uid() OR
  (visibility IN ('alumni_only','school_only') AND EXISTS (
    SELECT 1 FROM public.user_education ue
    WHERE ue.user_id = auth.uid() AND ue.school_id = yearbooks.school_id
  )) OR
  (visibility = 'connections_only' AND EXISTS (
    SELECT 1 FROM public.connections c
    WHERE ((c.user_id = auth.uid() AND c.connection_id = yearbooks.uploaded_by) OR
           (c.user_id = yearbooks.uploaded_by AND c.connection_id = auth.uid()))
    AND c.status = 'accepted'
  ))
);

CREATE POLICY "yearbooks_insert" ON public.yearbooks FOR INSERT WITH CHECK (
  auth.uid() = uploaded_by
);

CREATE POLICY "yearbooks_update" ON public.yearbooks FOR UPDATE USING (
  uploaded_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- Yearbook pages policies
CREATE POLICY "yearbook_pages_read" ON public.yearbook_pages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM yearbooks y
    WHERE y.id = yearbook_pages.yearbook_id
    AND (
      y.visibility = 'public' OR
      y.uploaded_by = auth.uid() OR
      (y.visibility IN ('alumni_only','school_only') AND EXISTS (
        SELECT 1 FROM public.user_education ue
        WHERE ue.user_id = auth.uid() AND ue.school_id = y.school_id
      ))
    )
  )
);

CREATE POLICY "yearbook_pages_insert" ON public.yearbook_pages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM yearbooks y
    WHERE y.id = yearbook_pages.yearbook_id
    AND y.uploaded_by = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- OCR text policies
CREATE POLICY "page_names_ocr_read" ON public.page_names_ocr FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM yearbook_pages yp
    JOIN yearbooks y ON y.id = yp.yearbook_id
    WHERE yp.id = page_names_ocr.page_id
    AND (
      y.visibility = 'public' OR
      y.uploaded_by = auth.uid() OR
      (y.visibility IN ('alumni_only','school_only') AND EXISTS (
        SELECT 1 FROM public.user_education ue
        WHERE ue.user_id = auth.uid() AND ue.school_id = y.school_id
      ))
    )
  )
);

-- Face detection policies
CREATE POLICY "page_faces_read" ON public.page_faces FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM yearbook_pages yp
    JOIN yearbooks y ON y.id = yp.yearbook_id
    WHERE yp.id = page_faces.page_id
    AND (
      y.visibility = 'public' OR
      y.uploaded_by = auth.uid() OR
      (y.visibility IN ('alumni_only','school_only') AND EXISTS (
        SELECT 1 FROM public.user_education ue
        WHERE ue.user_id = auth.uid() AND ue.school_id = y.school_id
      ))
    )
  )
);

CREATE POLICY "page_faces_update" ON public.page_faces FOR UPDATE USING (
  claimed_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- Claims policies
CREATE POLICY "claims_read" ON public.claims FOR SELECT USING (
  user_id = auth.uid() OR
  verified_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

CREATE POLICY "claims_insert" ON public.claims FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "claims_update" ON public.claims FOR UPDATE USING (
  verified_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- Safety queue policies (moderators only)
CREATE POLICY "safety_queue_read" ON public.safety_queue FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

CREATE POLICY "safety_queue_update" ON public.safety_queue FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- Posts policies
CREATE POLICY "posts_read" ON public.posts FOR SELECT USING (
  visibility = 'public' OR 
  author_id = auth.uid() OR 
  (visibility IN ('alumni_only','school_only','connections_only') AND (
    EXISTS (SELECT 1 FROM public.connections c WHERE
      (c.user_id = author_id AND c.connection_id = auth.uid() AND c.status = 'accepted') OR
      (c.user_id = auth.uid() AND c.connection_id = author_id AND c.status = 'accepted')
    ) OR
    (school_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_education ue 
      WHERE ue.user_id = auth.uid() AND ue.school_id = posts.school_id
    ))
  ))
);

CREATE POLICY "posts_crud_self" ON public.posts FOR ALL USING (
  author_id = auth.uid()
) WITH CHECK (
  author_id = auth.uid()
);

-- Comments policies
CREATE POLICY "comments_read" ON public.comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = comments.post_id
    AND (
      p.visibility = 'public' OR 
      p.author_id = auth.uid() OR 
      (p.visibility IN ('alumni_only','school_only','connections_only') AND (
        EXISTS (SELECT 1 FROM public.connections c WHERE
          (c.user_id = p.author_id AND c.connection_id = auth.uid() AND c.status = 'accepted') OR
          (c.user_id = auth.uid() AND c.connection_id = p.author_id AND c.status = 'accepted')
        ) OR
        (p.school_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.user_education ue 
          WHERE ue.user_id = auth.uid() AND ue.school_id = p.school_id
        ))
      ))
    )
  )
);

CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = comments.post_id
    AND (
      p.visibility = 'public' OR 
      p.author_id = auth.uid() OR 
      (p.visibility IN ('alumni_only','school_only','connections_only') AND (
        EXISTS (SELECT 1 FROM public.connections c WHERE
          (c.user_id = p.author_id AND c.connection_id = auth.uid() AND c.status = 'accepted') OR
          (c.user_id = auth.uid() AND c.connection_id = p.author_id AND c.status = 'accepted')
        ) OR
        (p.school_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.user_education ue 
          WHERE ue.user_id = auth.uid() AND ue.school_id = p.school_id
        ))
      ))
    )
  )
);

CREATE POLICY "comments_update_delete" ON public.comments FOR UPDATE USING (
  author_id = auth.uid()
);

CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (
  author_id = auth.uid()
);

-- Reactions policies
CREATE POLICY "reactions_read" ON public.reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = reactions.post_id
    AND (
      p.visibility = 'public' OR 
      p.author_id = auth.uid() OR 
      (p.visibility IN ('alumni_only','school_only','connections_only') AND (
        EXISTS (SELECT 1 FROM public.connections c WHERE
          (c.user_id = p.author_id AND c.connection_id = auth.uid() AND c.status = 'accepted') OR
          (c.user_id = auth.uid() AND c.connection_id = p.author_id AND c.status = 'accepted')
        ) OR
        (p.school_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.user_education ue 
          WHERE ue.user_id = auth.uid() AND ue.school_id = p.school_id
        ))
      ))
    )
  )
);

CREATE POLICY "reactions_manage" ON public.reactions FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- Connections policies
CREATE POLICY "connections_read" ON public.connections FOR SELECT USING (
  user_id = auth.uid() OR connection_id = auth.uid()
);

CREATE POLICY "connections_manage" ON public.connections FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- Groups policies
CREATE POLICY "groups_read" ON public.groups FOR SELECT USING (
  visibility = 'public' OR
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid()) OR
  (visibility IN ('alumni_only','school_only') AND school_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_education ue
    WHERE ue.user_id = auth.uid() AND ue.school_id = groups.school_id
  ))
);

CREATE POLICY "groups_insert" ON public.groups FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "groups_update" ON public.groups FOR UPDATE USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'admin')
);

-- Group members policies
CREATE POLICY "group_members_read" ON public.group_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
);

CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND created_by = auth.uid())
);

-- Events policies
CREATE POLICY "events_read" ON public.events FOR SELECT USING (
  visibility = 'public' OR
  created_by = auth.uid() OR
  (visibility IN ('alumni_only','school_only') AND host_type = 'school' AND EXISTS (
    SELECT 1 FROM public.user_education ue
    WHERE ue.user_id = auth.uid() AND ue.school_id = events.host_id
  )) OR
  (host_type = 'group' AND EXISTS (
    SELECT 1 FROM group_members WHERE group_id = events.host_id AND user_id = auth.uid()
  ))
);

CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "events_update" ON public.events FOR UPDATE USING (
  created_by = auth.uid()
);

-- Event orders policies
CREATE POLICY "event_orders_read" ON public.event_orders FOR SELECT USING (
  purchaser_id = auth.uid()
);

CREATE POLICY "event_orders_insert" ON public.event_orders FOR INSERT WITH CHECK (
  purchaser_id = auth.uid()
);

-- Businesses policies
CREATE POLICY "businesses_read" ON public.businesses FOR SELECT USING (true); -- Public directory

CREATE POLICY "businesses_manage" ON public.businesses FOR ALL USING (
  owner_id = auth.uid()
) WITH CHECK (
  owner_id = auth.uid()
);

-- Jobs policies
CREATE POLICY "jobs_read" ON public.jobs FOR SELECT USING (
  visibility = 'public' OR
  posted_by = auth.uid() OR
  (visibility IN ('alumni_only','school_only') AND EXISTS (
    SELECT 1 FROM public.user_education ue1
    JOIN public.user_education ue2 ON ue1.school_id = ue2.school_id
    WHERE ue1.user_id = auth.uid() AND ue2.user_id = jobs.posted_by
  ))
);

CREATE POLICY "jobs_manage" ON public.jobs FOR ALL USING (
  posted_by = auth.uid()
) WITH CHECK (
  posted_by = auth.uid()
);

-- Job applications policies
CREATE POLICY "job_applications_read" ON public.job_applications FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM jobs WHERE id = job_applications.job_id AND posted_by = auth.uid())
);

CREATE POLICY "job_applications_insert" ON public.job_applications FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- Mentorship profiles policies
CREATE POLICY "mentorship_profiles_read" ON public.mentorship_profiles FOR SELECT USING (true); -- Public directory

CREATE POLICY "mentorship_profiles_manage" ON public.mentorship_profiles FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- Conversations policies
CREATE POLICY "conversations_read" ON public.conversations FOR SELECT USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = conversations.id AND user_id = auth.uid())
);

CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

-- Conversation members policies
CREATE POLICY "conversation_members_read" ON public.conversation_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid())
);

-- Messages policies (assuming messages table links to conversations)
-- This will be handled when we check the existing messages table structure

-- Notifications policies
CREATE POLICY "notifications_read" ON public.notifications FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (
  user_id = auth.uid()
);

-- Moderation reports policies
CREATE POLICY "moderation_reports_read" ON public.moderation_reports FOR SELECT USING (
  reporter_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

CREATE POLICY "moderation_reports_insert" ON public.moderation_reports FOR INSERT WITH CHECK (
  reporter_id = auth.uid()
);

-- Moderation actions policies (moderators only)
CREATE POLICY "moderation_actions_read" ON public.moderation_actions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

CREATE POLICY "moderation_actions_insert" ON public.moderation_actions FOR INSERT WITH CHECK (
  moderator_id = auth.uid() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND trust_level IN ('moderator', 'staff'))
);

-- School aliases policies (public read)
CREATE POLICY "school_aliases_read" ON public.school_aliases FOR SELECT USING (true);

-- Class years policies (public read)
CREATE POLICY "class_years_read" ON public.class_years FOR SELECT USING (true);