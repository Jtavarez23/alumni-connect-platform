-- Alumni Connect - Basic RLS Policies
-- Essential security policies for yearbook system

-- Profiles policies
CREATE POLICY "Users can view public profiles" ON public.profiles
  FOR SELECT USING (is_private = false OR id = auth.uid());

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Schools policies - public read access
CREATE POLICY "Anyone can view schools" ON public.schools
  FOR SELECT USING (true);

-- User education policies
CREATE POLICY "Users can view own education" ON public.user_education
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own education" ON public.user_education
  FOR ALL USING (user_id = auth.uid());

-- Yearbooks policies - alumni network access
CREATE POLICY "Users can view yearbooks from their schools" ON public.yearbooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_education ue 
      WHERE ue.user_id = auth.uid() 
      AND ue.school_id = yearbooks.school_id
    )
    OR is_public = true
  );

CREATE POLICY "Verified users can upload yearbooks" ON public.yearbooks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.trust_level IN ('verified_alumni', 'school_admin', 'moderator', 'staff')
    )
  );

-- Yearbook pages policies
CREATE POLICY "Users can view pages from accessible yearbooks" ON public.yearbook_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.yearbooks y
      JOIN public.user_education ue ON ue.school_id = y.school_id
      WHERE y.id = yearbook_pages.yearbook_id
      AND ue.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.yearbooks y
      WHERE y.id = yearbook_pages.yearbook_id
      AND y.is_public = true
    )
  );

-- OCR text policies - same as pages
CREATE POLICY "Users can view OCR from accessible pages" ON public.page_names_ocr
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.yearbook_pages yp
      JOIN public.yearbooks y ON y.id = yp.yearbook_id
      JOIN public.user_education ue ON ue.school_id = y.school_id
      WHERE yp.id = page_names_ocr.page_id
      AND ue.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.yearbook_pages yp
      JOIN public.yearbooks y ON y.id = yp.yearbook_id
      WHERE yp.id = page_names_ocr.page_id
      AND y.is_public = true
    )
  );

-- Face detection policies - same as pages
CREATE POLICY "Users can view faces from accessible pages" ON public.page_faces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.yearbook_pages yp
      JOIN public.yearbooks y ON y.id = yp.yearbook_id
      JOIN public.user_education ue ON ue.school_id = y.school_id
      WHERE yp.id = page_faces.page_id
      AND ue.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.yearbook_pages yp
      JOIN public.yearbooks y ON y.id = yp.yearbook_id
      WHERE yp.id = page_faces.page_id
      AND y.is_public = true
    )
  );

-- Claims policies
CREATE POLICY "Users can view own claims" ON public.claims
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create claims" ON public.claims
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Moderators can manage claims" ON public.claims
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.trust_level IN ('school_admin', 'moderator', 'staff')
    )
  );

-- Class years policies
CREATE POLICY "Anyone can view class years" ON public.class_years
  FOR SELECT USING (true);

-- Safety queue policies - staff only
CREATE POLICY "Staff can manage safety queue" ON public.safety_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.trust_level IN ('moderator', 'staff')
    )
  );