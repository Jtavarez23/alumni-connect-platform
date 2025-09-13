-- ===========================================
-- ALUMNI CONNECT - CONSOLIDATED SCHEMA REBUILD
-- Google SWE Architecture Approach: Single-pass, dependency-free schema
-- ===========================================

-- Drop existing problematic data (if any exist)
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;
DROP TABLE IF EXISTS public.yearbook_editions CASCADE;
DROP TABLE IF EXISTS public.class_years CASCADE;
DROP TABLE IF EXISTS public.yearbooks CASCADE;
DROP TABLE IF EXISTS public.yearbook_pages CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.reactions CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP TABLE IF EXISTS public.messaging_permissions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.analytics_events CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===========================================
-- CORE FOUNDATION TABLES (No dependencies)
-- ===========================================

-- Schools (foundation table - no dependencies)
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('high_school', 'college', 'university', 'middle_school')),
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'US',
    location JSONB,
    domain TEXT,
    verified BOOLEAN DEFAULT false,
    founded_year INTEGER,
    mascot TEXT,
    colors JSONB,
    user_submitted BOOLEAN DEFAULT false,
    submission_status TEXT DEFAULT 'approved' CHECK (submission_status IN ('pending', 'approved', 'rejected')),
    submitted_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class years for schools
CREATE TABLE public.class_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, year)
);

-- ===========================================
-- USER MANAGEMENT TABLES
-- ===========================================

-- User profiles (references auth.users which exists in Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    school_id UUID REFERENCES public.schools(id),
    graduation_year INTEGER,
    is_public BOOLEAN DEFAULT true,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
    profile_views_enabled BOOLEAN DEFAULT false,
    all_years_networking BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    search_quota_used INTEGER DEFAULT 0,
    search_quota_reset_date DATE DEFAULT CURRENT_DATE,
    bio TEXT,
    avatar_url TEXT,
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multi-school education history
CREATE TABLE public.user_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    start_year INTEGER NOT NULL,
    end_year INTEGER,
    is_primary BOOLEAN DEFAULT false,
    role_type TEXT NOT NULL DEFAULT 'student' CHECK (role_type IN ('student', 'teacher', 'staff', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, school_id, start_year)
);

-- Search quotas for subscription tiers
CREATE TABLE public.search_quotas (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    searches_used INTEGER NOT NULL DEFAULT 0,
    search_limit INTEGER NOT NULL DEFAULT 3,
    earned_searches INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- ===========================================
-- YEARBOOK SYSTEM
-- ===========================================

-- Yearbooks
CREATE TABLE public.yearbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    cover_image_url TEXT,
    total_pages INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    uploaded_by UUID REFERENCES public.profiles(id),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, year)
);

-- Yearbook pages
CREATE TABLE public.yearbook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    yearbook_id UUID NOT NULL REFERENCES public.yearbooks(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    original_image_url TEXT NOT NULL,
    tile_base_url TEXT,
    ocr_text TEXT,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(yearbook_id, page_number)
);

-- ===========================================
-- SOCIAL FEATURES
-- ===========================================

-- Social posts
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'school' CHECK (visibility IN ('public', 'school', 'friends', 'private')),
    school_id UUID REFERENCES public.schools(id),
    media_urls JSONB DEFAULT '[]',
    post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'photo', 'yearbook_memory', 'event_share')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments on posts
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions to posts
CREATE TABLE public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'wow', 'laugh', 'sad', 'angry')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- ===========================================
-- MESSAGING SYSTEM
-- ===========================================

-- Friendships
CREATE TABLE public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

-- Messaging permissions
CREATE TABLE public.messaging_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    can_message BOOLEAN NOT NULL DEFAULT false,
    reason TEXT CHECK (reason IN ('mutual_connection', 'same_school', 'admin_override', 'manual_approval')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sender_id, recipient_id)
);

-- ===========================================
-- NOTIFICATIONS SYSTEM
-- ===========================================

-- User notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('friend_request', 'post_comment', 'reaction', 'system', 'search_quota', 'message', 'claim_approved')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    related_type TEXT CHECK (related_type IN ('post', 'comment', 'profile', 'message', 'claim')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ANALYTICS & TRACKING
-- ===========================================

-- Analytics events
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- PERFORMANCE INDEXES
-- ===========================================

-- Schools indexes
CREATE INDEX idx_schools_slug ON public.schools(slug);
CREATE INDEX idx_schools_type ON public.schools(type);

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_school_graduation ON public.profiles(school_id, graduation_year);
CREATE INDEX idx_profiles_subscription_tier ON public.profiles(subscription_tier);

-- Education history indexes
CREATE INDEX idx_user_education_user_school ON public.user_education(user_id, school_id);
CREATE INDEX idx_user_education_school_year ON public.user_education(school_id, start_year, end_year);

-- Yearbook indexes
CREATE INDEX idx_yearbooks_school_year ON public.yearbooks(school_id, year);
CREATE INDEX idx_yearbook_pages_yearbook ON public.yearbook_pages(yearbook_id, page_number);

-- Social indexes
CREATE INDEX idx_posts_user_created ON public.posts(user_id, created_at DESC);
CREATE INDEX idx_posts_school_created ON public.posts(school_id, created_at DESC);
CREATE INDEX idx_posts_visibility ON public.posts(visibility);
CREATE INDEX idx_comments_post ON public.comments(post_id, created_at);
CREATE INDEX idx_reactions_post_user ON public.reactions(post_id, user_id);

-- Messaging indexes
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id, status);
CREATE INDEX idx_messaging_permissions_sender ON public.messaging_permissions(sender_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);

-- Analytics indexes
CREATE INDEX idx_analytics_events_user_type ON public.analytics_events(user_id, event_type);
CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at);

-- ===========================================
-- ROW LEVEL SECURITY SETUP
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (secure defaults)
-- Schools: Public read
CREATE POLICY "Schools are viewable by everyone" ON public.schools FOR SELECT USING (true);

-- Profiles: Users can view public profiles or their own
CREATE POLICY "Users can view public profiles" ON public.profiles FOR SELECT USING (is_public = true OR auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Posts: Users can view posts based on visibility rules
CREATE POLICY "Users can view posts" ON public.posts FOR SELECT USING (
    visibility = 'public' OR 
    (auth.uid() = user_id)
);

-- Comments: Users can view comments on posts they can see
CREATE POLICY "Users can view comments" ON public.comments FOR SELECT USING (
    post_id IN (SELECT id FROM public.posts WHERE visibility = 'public' OR posts.user_id = auth.uid())
);

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- Friendships: Users can see friendships they're part of
CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Analytics: Users can view their own analytics
CREATE POLICY "Users can view their own analytics events" ON public.analytics_events FOR SELECT USING (auth.uid() = user_id);

-- User education: Users can view their own education history
CREATE POLICY "Users can view their own education" ON public.user_education FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own education" ON public.user_education FOR UPDATE USING (auth.uid() = user_id);

-- Search quotas: Users can view and update their own quotas
CREATE POLICY "Users can view their own search quotas" ON public.search_quotas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own search quotas" ON public.search_quotas FOR UPDATE USING (auth.uid() = user_id);

-- Class years: Public read
CREATE POLICY "Class years are viewable by everyone" ON public.class_years FOR SELECT USING (true);

-- ===========================================
-- SCHEMA REBUILD COMPLETE
-- ===========================================

-- Success message
SELECT 'Consolidated database schema rebuild completed successfully! 🎉' as status;