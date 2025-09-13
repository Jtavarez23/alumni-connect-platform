-- Add school banner and description fields
ALTER TABLE public.schools 
ADD COLUMN banner_image_url text,
ADD COLUMN description text,
ADD COLUMN principal_name text,
ADD COLUMN total_students integer;

-- Create school photos table
CREATE TABLE public.school_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  photo_url text NOT NULL,
  category text DEFAULT 'general',
  uploaded_by uuid REFERENCES auth.users(id),
  upload_date timestamp with time zone DEFAULT now(),
  academic_year text,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create school clubs table
CREATE TABLE public.school_clubs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text DEFAULT 'academic',
  founded_year integer,
  advisor_name text,
  meeting_schedule text,
  contact_info text,
  logo_url text,
  is_active boolean DEFAULT true,
  member_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_clubs ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_photos
CREATE POLICY "Anyone can view approved school photos" ON public.school_photos
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload photos to their schools" ON public.school_photos
FOR INSERT WITH CHECK (
  auth.uid() = uploaded_by AND
  school_id IN (
    SELECT school_id FROM public.school_history 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own photos" ON public.school_photos
FOR UPDATE USING (auth.uid() = uploaded_by);

-- RLS policies for school_clubs  
CREATE POLICY "Anyone can view school clubs" ON public.school_clubs
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create clubs for their schools" ON public.school_clubs
FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  school_id IN (
    SELECT school_id FROM public.school_history 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update clubs they created" ON public.school_clubs
FOR UPDATE USING (auth.uid() = created_by);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('school-banners', 'school-banners', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('school-photos', 'school-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true);

-- Storage policies for school banners
CREATE POLICY "Anyone can view school banners" ON storage.objects
FOR SELECT USING (bucket_id = 'school-banners');

CREATE POLICY "Users can upload school banners" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'school-banners' AND auth.uid() IS NOT NULL);

-- Storage policies for school photos
CREATE POLICY "Anyone can view school photos" ON storage.objects
FOR SELECT USING (bucket_id = 'school-photos');

CREATE POLICY "Users can upload school photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'school-photos' AND auth.uid() IS NOT NULL);

-- Storage policies for club logos
CREATE POLICY "Anyone can view club logos" ON storage.objects
FOR SELECT USING (bucket_id = 'club-logos');

CREATE POLICY "Users can upload club logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'club-logos' AND auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_school_photos_school_id ON public.school_photos(school_id);
CREATE INDEX idx_school_photos_category ON public.school_photos(category);
CREATE INDEX idx_school_clubs_school_id ON public.school_clubs(school_id);
CREATE INDEX idx_school_clubs_category ON public.school_clubs(category);

-- Add update triggers
CREATE TRIGGER update_school_photos_updated_at
BEFORE UPDATE ON public.school_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_clubs_updated_at
BEFORE UPDATE ON public.school_clubs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();