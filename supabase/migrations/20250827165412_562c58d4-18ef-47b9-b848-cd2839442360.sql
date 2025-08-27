-- Create schools table
CREATE TABLE public.schools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  domain text, -- .edu domain for verification
  type text CHECK (type IN ('high_school', 'college', 'university')) NOT NULL,
  location jsonb NOT NULL, -- {city, state, country}
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  username text UNIQUE,
  avatar_url text,
  bio text,
  school_id uuid REFERENCES schools(id),
  graduation_year integer,
  verification_status text CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  subscription_status text CHECK (subscription_status IN ('free', 'premium', 'school')) DEFAULT 'free',
  privacy_level text CHECK (privacy_level IN ('public', 'alumni', 'friends')) DEFAULT 'friends',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create yearbook_editions table
CREATE TABLE public.yearbook_editions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  title text,
  cover_image_url text,
  page_count integer DEFAULT 0,
  upload_status text CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, year)
);

-- Create yearbook_entries table
CREATE TABLE public.yearbook_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id uuid REFERENCES yearbook_editions(id) ON DELETE CASCADE NOT NULL,
  student_name text NOT NULL,
  photo_url text,
  page_number integer,
  activities text[],
  honors text[],
  quote text,
  profile_id uuid REFERENCES profiles(id), -- linked when claimed
  created_at timestamptz DEFAULT now()
);

-- Create friendships table
CREATE TABLE public.friendships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  verification_method text, -- 'peer', 'mutual', 'school_email'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create policies for schools (public read)
CREATE POLICY "Schools are viewable by everyone"
ON public.schools FOR SELECT
USING (true);

-- Create policies for yearbook editions
CREATE POLICY "Yearbook editions are viewable by authenticated users"
ON public.yearbook_editions FOR SELECT
TO authenticated
USING (true);

-- Create policies for yearbook entries
CREATE POLICY "Yearbook entries are viewable by authenticated users"
ON public.yearbook_entries FOR SELECT
TO authenticated
USING (true);

-- Create policies for friendships
CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friendship requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're involved in"
ON public.friendships FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, graduation_year)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    CASE 
      WHEN new.raw_user_meta_data->>'graduation_year' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'graduation_year')::integer
      ELSE NULL
    END
  );
  RETURN new;
END;
$$;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();