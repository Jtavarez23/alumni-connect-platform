-- Core Social Tables Migration
-- Creates all tables referenced in the comprehensive seed data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- CORE SOCIAL TABLES
-- ===========================================

-- User education history (multiple schools per user)
CREATE TABLE IF NOT EXISTS public.user_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    start_year INTEGER NOT NULL,
    end_year INTEGER,
    is_primary BOOLEAN DEFAULT false,
    role_type TEXT NOT NULL DEFAULT 'student' CHECK (role_type IN ('student', 'teacher', 'staff', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, school_id, start_year)
);

-- Search quotas for free/premium users
CREATE TABLE IF NOT EXISTS public.search_quotas (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    searches_used INTEGER NOT NULL DEFAULT 0,
    search_limit INTEGER NOT NULL DEFAULT 3,
    earned_searches INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Friendships between users
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

-- Messaging permissions (who can message whom)
CREATE TABLE IF NOT EXISTS public.messaging_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    can_message BOOLEAN NOT NULL DEFAULT false,
    reason TEXT CHECK (reason IN ('mutual_connection', 'same_school', 'admin_override', 'manual_approval')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sender_id, recipient_id)
);

-- Social posts
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'school' CHECK (visibility IN ('public', 'school', 'friends', 'private')),
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments on posts
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions to posts (likes, loves, etc.)
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'wow', 'laugh', 'sad', 'angry')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- User notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('friend_request', 'post_comment', 'reaction', 'system', 'search_quota')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    related_type TEXT CHECK (related_type IN ('post', 'comment', 'profile', 'message')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events tracking
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class years for schools (already created in yearbook processing migration)
-- This table is referenced here for completeness but already exists

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Indexes for user_education
CREATE INDEX IF NOT EXISTS idx_user_education_user_id ON public.user_education(user_id);
CREATE INDEX IF NOT EXISTS idx_user_education_school_id ON public.user_education(school_id);

-- Indexes for search_quotas
CREATE INDEX IF NOT EXISTS idx_search_quotas_date ON public.search_quotas(date);

-- Indexes for friendships
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Indexes for messaging_permissions
CREATE INDEX IF NOT EXISTS idx_messaging_permissions_sender_id ON public.messaging_permissions(sender_id);
CREATE INDEX IF NOT EXISTS idx_messaging_permissions_recipient_id ON public.messaging_permissions(recipient_id);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_school_id ON public.posts(school_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Indexes for reactions
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Indexes for class_years (already created in yearbook processing migration)

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
-- class_years RLS is enabled in yearbook processing migration

-- Basic RLS policies (can be enhanced later)
CREATE POLICY "Users can view their own education history" ON public.user_education FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own search quotas" ON public.search_quotas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own friendships" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can view their own messaging permissions" ON public.messaging_permissions FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can view public posts" ON public.posts FOR SELECT USING (visibility = 'public' OR (visibility = 'school' AND school_id IN (SELECT school_id FROM public.user_education WHERE user_id = auth.uid())));
CREATE POLICY "Users can view comments on visible posts" ON public.comments FOR SELECT USING (post_id IN (SELECT id FROM public.posts WHERE visibility = 'public' OR (visibility = 'school' AND school_id IN (SELECT school_id FROM public.user_education WHERE user_id = auth.uid()))));
CREATE POLICY "Users can view reactions on visible posts" ON public.reactions FOR SELECT USING (post_id IN (SELECT id FROM public.posts WHERE visibility = 'public' OR (visibility = 'school' AND school_id IN (SELECT school_id FROM public.user_education WHERE user_id = auth.uid()))));
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view analytics events" ON public.analytics_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND subscription_tier = 'enterprise'));
-- Class years RLS policy already exists in yearbook processing migration

-- ===========================================
-- MIGRATION COMPLETE
-- ===========================================