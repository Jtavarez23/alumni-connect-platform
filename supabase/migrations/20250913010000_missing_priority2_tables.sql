-- Migration: Missing Priority 2 Tables Completion
-- Add any remaining tables from Priority 2 that haven't been implemented yet

-- =============================================
-- MENTORSHIP SYSTEM TABLES
-- =============================================

-- Mentorship profiles
CREATE TABLE IF NOT EXISTS public.mentorship_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('mentor', 'mentee', 'both')) DEFAULT 'both',
    bio TEXT,
    expertise_areas TEXT[], -- array of skill/industry areas
    career_stage TEXT,
    current_role TEXT,
    current_company TEXT,
    industries TEXT[],
    skills TEXT[],
    languages TEXT[],
    availability JSONB, -- {timezone, preferred_days, preferred_times}
    meeting_preferences TEXT[], -- ['video', 'phone', 'in-person', 'chat']
    max_mentees INTEGER DEFAULT 3, -- for mentors
    is_available BOOLEAN DEFAULT true,
    linkedin_url TEXT,
    portfolio_url TEXT,
    hourly_rate_cents INTEGER, -- optional for paid mentorship
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentorship matches/connections
CREATE TABLE IF NOT EXISTS public.mentorship_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('suggested', 'accepted', 'ended')) DEFAULT 'suggested',
    match_score INTEGER, -- algorithm confidence score
    matched_on JSONB, -- what criteria they matched on
    message TEXT, -- initial connection message
    accepted_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    end_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mentor_id, mentee_id)
);

-- =============================================
-- JOBS SYSTEM TABLES
-- =============================================

-- Jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL, -- link to business if applicable
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    remote BOOLEAN DEFAULT false,
    job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'volunteer')),
    experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive')),
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT DEFAULT 'USD',
    description TEXT NOT NULL,
    requirements TEXT,
    benefits TEXT,
    apply_url TEXT,
    apply_email TEXT,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'school', 'alumni_only')),
    is_featured BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job applications tracking
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    resume_url TEXT,
    status TEXT CHECK (status IN ('applied', 'reviewing', 'interviewing', 'offered', 'rejected', 'withdrawn')) DEFAULT 'applied',
    notes TEXT, -- internal notes
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- Job saves/bookmarks
CREATE TABLE IF NOT EXISTS public.job_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- =============================================
-- ENHANCED YEARBOOK CLAIMS SYSTEM
-- =============================================

-- Face claims for yearbook photos
CREATE TABLE IF NOT EXISTS public.yearbook_face_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_face_id UUID NOT NULL REFERENCES public.page_faces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    confidence_score DECIMAL(3,2), -- AI confidence 0.00-1.00
    verification_method TEXT CHECK (verification_method IN ('auto', 'manual', 'peer_verified')),
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_face_id, user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Mentorship indexes
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_role ON public.mentorship_profiles(role);
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_available ON public.mentorship_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_expertise ON public.mentorship_profiles USING GIN(expertise_areas);
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_industries ON public.mentorship_profiles USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_mentorship_profiles_skills ON public.mentorship_profiles USING GIN(skills);

CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentor ON public.mentorship_matches(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_mentee ON public.mentorship_matches(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_matches_status ON public.mentorship_matches(status);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON public.jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_remote ON public.jobs(remote);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON public.jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON public.jobs(experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON public.jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_jobs_search ON public.jobs USING GIN(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(company, '') || ' ' || coalesce(description, '')));

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);

CREATE INDEX IF NOT EXISTS idx_job_saves_user ON public.job_saves(user_id);

-- Yearbook claims indexes
CREATE INDEX IF NOT EXISTS idx_yearbook_face_claims_user ON public.yearbook_face_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_yearbook_face_claims_status ON public.yearbook_face_claims(status);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.mentorship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_face_claims ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BASIC RLS POLICIES
-- =============================================

-- Mentorship profiles: Users can view public profiles or their own
CREATE POLICY "Users can view mentorship profiles" ON public.mentorship_profiles 
    FOR SELECT USING (auth.uid() = user_id OR is_available = true);

CREATE POLICY "Users can update own mentorship profile" ON public.mentorship_profiles 
    FOR UPDATE USING (auth.uid() = user_id);

-- Mentorship matches: Users can see matches they're involved in
CREATE POLICY "Users can view their mentorship matches" ON public.mentorship_matches 
    FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

-- Jobs: Public read for job listings
CREATE POLICY "Jobs are viewable by everyone" ON public.jobs 
    FOR SELECT USING (true);

-- Job applications: Users can only see their own applications
CREATE POLICY "Users can view their own job applications" ON public.job_applications 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create job applications" ON public.job_applications 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Job saves: Users can only see their own saved jobs
CREATE POLICY "Users can manage their job saves" ON public.job_saves 
    FOR ALL USING (auth.uid() = user_id);

-- Yearbook face claims: Users can see their own claims
CREATE POLICY "Users can view their own face claims" ON public.yearbook_face_claims 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create face claims" ON public.yearbook_face_claims 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TRIGGER FOR UPDATED_AT TIMESTAMPS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_mentorship_profiles_updated_at 
    BEFORE UPDATE ON public.mentorship_profiles 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_mentorship_matches_updated_at 
    BEFORE UPDATE ON public.mentorship_matches 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON public.jobs 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_job_applications_updated_at 
    BEFORE UPDATE ON public.job_applications 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

SELECT 'Missing Priority 2 tables migration completed successfully!' as status;