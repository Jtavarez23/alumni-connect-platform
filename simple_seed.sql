-- Simple seed data for Alumni Connect local demo
-- This creates basic tables and data for demonstration

-- First ensure we have the basic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schools table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('high_school', 'college', 'university', 'middle_school')),
    location JSONB,
    domain TEXT,
    verified BOOLEAN DEFAULT false,
    founded_year INTEGER,
    mascot TEXT,
    colors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table if it doesn't exist with essential columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    school_id UUID REFERENCES public.schools(id),
    graduation_year INTEGER,
    is_public BOOLEAN DEFAULT true,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class_years table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.class_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, year)
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_years ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
DROP POLICY IF EXISTS "Schools are viewable by everyone" ON public.schools;
CREATE POLICY "Schools are viewable by everyone" ON public.schools FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
CREATE POLICY "Users can view public profiles" ON public.profiles FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Class years are viewable by everyone" ON public.class_years;
CREATE POLICY "Class years are viewable by everyone" ON public.class_years FOR SELECT USING (true);

-- Insert sample schools (with conflict handling)
INSERT INTO public.schools (name, slug, type, location, verified, founded_year, mascot, colors) 
VALUES 
    ('Springfield High School', 'springfield-high-school', 'high_school', 
     '{"city": "Springfield", "state": "Illinois", "country": "USA"}', true, 1920, 'Tigers', '["orange", "black"]'),
    ('Riverside Academy', 'riverside-academy', 'high_school',
     '{"city": "Riverside", "state": "California", "country": "USA"}', true, 1955, 'Eagles', '["blue", "gold"]'),
    ('Stanford University', 'stanford-university', 'university',
     '{"city": "Stanford", "state": "California", "country": "USA"}', true, 1885, 'Cardinal', '["cardinal", "white"]'),
    ('Harvard University', 'harvard-university', 'university',
     '{"city": "Cambridge", "state": "Massachusetts", "country": "USA"}', true, 1636, 'Crimson', '["crimson", "white"]'),
    ('Lincoln Middle School', 'lincoln-middle-school', 'middle_school',
     '{"city": "Springfield", "state": "Illinois", "country": "USA"}', true, 1960, 'Lions', '["green", "white"]')
ON CONFLICT (slug) DO NOTHING;

-- Add class years for each school (2000-2030)
DO $$
DECLARE
    school_record RECORD;
    year_val INTEGER;
BEGIN
    FOR school_record IN SELECT id FROM public.schools LOOP
        FOR year_val IN 2000..2030 LOOP
            INSERT INTO public.class_years (school_id, year) 
            VALUES (school_record.id, year_val)
            ON CONFLICT (school_id, year) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Insert sample profiles (test users)
INSERT INTO public.profiles (id, email, first_name, last_name, school_id, graduation_year, is_public, subscription_tier, bio, avatar_url)
SELECT 
    gen_random_uuid(),
    'sarah.johnson@example.com', 
    'Sarah', 
    'Johnson', 
    s.id, 
    2020, 
    true, 
    'free', 
    'Class president, photography enthusiast, future journalist', 
    'https://example.com/avatars/sarah.jpg'
FROM public.schools s WHERE s.slug = 'springfield-high-school'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, school_id, graduation_year, is_public, subscription_tier, bio, avatar_url)
SELECT 
    gen_random_uuid(),
    'mike.chen@example.com', 
    'Mike', 
    'Chen', 
    s.id, 
    2019, 
    true, 
    'premium', 
    'Basketball captain, software engineer at Google, loves hiking', 
    'https://example.com/avatars/mike.jpg'
FROM public.schools s WHERE s.slug = 'riverside-academy'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, school_id, graduation_year, is_public, subscription_tier, bio, avatar_url)
SELECT 
    gen_random_uuid(),
    'emma.davis@example.com', 
    'Emma', 
    'Davis', 
    s.id, 
    2018, 
    true, 
    'free', 
    'Drama club president, theater major, aspiring actress', 
    'https://example.com/avatars/emma.jpg'
FROM public.schools s WHERE s.slug = 'stanford-university'
ON CONFLICT (email) DO NOTHING;

-- Success message
SELECT 'Alumni Connect seed data loaded successfully!' AS status;