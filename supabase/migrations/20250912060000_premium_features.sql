-- Premium Groups and Events Features
-- Monetization features for premium subscriptions and exclusive content
-- Part of Sprint 6: P2 Features for monetization-ready platform

-- =============================================
-- PREMIUM SUBSCRIPTION EXTENSIONS
-- =============================================

-- Premium subscription tiers and features
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('premium', 'premium_plus', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    stripe_subscription_id TEXT UNIQUE,
    features JSONB NOT NULL DEFAULT '{}', -- Available premium features
    billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    trial_end_date TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 month',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tier)
);

-- Premium groups with exclusive features
CREATE TABLE IF NOT EXISTS public.premium_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_type TEXT DEFAULT 'premium' CHECK (group_type IN ('premium', 'enterprise', 'alumni_exclusive')),
    access_level TEXT DEFAULT 'subscription' CHECK (access_level IN ('free', 'subscription', 'invite_only', 'paid')),
    subscription_tier_required TEXT CHECK (subscription_tier_required IN ('premium', 'premium_plus', 'enterprise')),
    price_cents INTEGER DEFAULT 0, -- One-time access fee
    member_limit INTEGER, -- NULL for unlimited
    features JSONB DEFAULT '{}', -- Group-specific premium features
    metadata JSONB DEFAULT '{}', -- Additional group settings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Premium group memberships
CREATE TABLE IF NOT EXISTS public.premium_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.premium_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
    access_type TEXT DEFAULT 'subscription' CHECK (access_type IN ('subscription', 'paid', 'invited', 'grandfathered')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'expired', 'refunded')),
    stripe_payment_intent_id TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(group_id, user_id)
);

-- Premium events with enhanced features
CREATE TABLE IF NOT EXISTS public.premium_event_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL, -- 'VIP', 'Premium', 'Exclusive', etc.
    tier_description TEXT,
    price_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    max_attendees INTEGER,
    features JSONB DEFAULT '{}', -- Tier-specific features
    perks JSONB DEFAULT '{}', -- Special perks for this tier
    stripe_price_id TEXT, -- Stripe price ID for recurring events
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alumni perks and benefits system
CREATE TABLE IF NOT EXISTS public.alumni_perks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    perk_type TEXT NOT NULL CHECK (perk_type IN ('discount', 'free_service', 'exclusive_access', 'bonus')),
    value_type TEXT DEFAULT 'percentage' CHECK (value_type IN ('percentage', 'fixed_amount', 'description_only')),
    discount_value DECIMAL(5,2), -- For percentage or fixed discounts
    currency TEXT DEFAULT 'USD',
    terms_conditions TEXT,
    redemption_code TEXT, -- Optional promo code
    redemption_url TEXT, -- Direct link for redemption
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER, -- NULL for unlimited
    usage_count INTEGER DEFAULT 0,
    school_restrictions JSONB DEFAULT '[]', -- Specific schools if restricted
    tier_restrictions JSONB DEFAULT '[]', -- Premium tiers if restricted
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User perk redemptions tracking
CREATE TABLE IF NOT EXISTS public.perk_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perk_id UUID NOT NULL REFERENCES public.alumni_perks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    redemption_method TEXT DEFAULT 'website' CHECK (redemption_method IN ('website', 'mobile', 'email', 'phone')),
    redemption_details JSONB DEFAULT '{}', -- Store additional redemption info
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(perk_id, user_id) -- One redemption per user per perk
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_user ON public.premium_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_stripe ON public.premium_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_premium_groups_school ON public.premium_groups(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_premium_groups_creator ON public.premium_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_premium_group_members_group ON public.premium_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_premium_group_members_user ON public.premium_group_members(user_id, access_type);
CREATE INDEX IF NOT EXISTS idx_premium_event_tiers_event ON public.premium_event_tiers(event_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alumni_perks_business ON public.alumni_perks(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alumni_perks_featured ON public.alumni_perks(is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_alumni_perks_valid_date ON public.alumni_perks(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_user ON public.perk_redemptions(user_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_perk_redemptions_perk ON public.perk_redemptions(perk_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Premium subscriptions - users can see their own
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.premium_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions" ON public.premium_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Premium groups - visibility based on access level
ALTER TABLE public.premium_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium groups visible to authenticated users" ON public.premium_groups
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users can manage their own groups" ON public.premium_groups
    FOR ALL USING (auth.uid() = created_by);

-- Premium group members - members can see group membership
ALTER TABLE public.premium_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can see membership" ON public.premium_group_members
    FOR SELECT USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.premium_group_members pgm 
            WHERE pgm.group_id = premium_group_members.group_id 
            AND pgm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own membership" ON public.premium_group_members
    FOR ALL USING (auth.uid() = user_id);

-- Premium event tiers - visible to all authenticated users
ALTER TABLE public.premium_event_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium event tiers visible to authenticated users" ON public.premium_event_tiers
    FOR SELECT TO authenticated USING (is_active = true);

-- Alumni perks - visible to all authenticated users
ALTER TABLE public.alumni_perks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumni perks visible to authenticated users" ON public.alumni_perks
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users can manage their own perks" ON public.alumni_perks
    FOR ALL USING (auth.uid() = created_by);

-- Perk redemptions - users can see their own
ALTER TABLE public.perk_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own perk redemptions" ON public.perk_redemptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own perk redemptions" ON public.perk_redemptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- PREMIUM FEATURE FUNCTIONS
-- =============================================

-- Check if user has premium access
CREATE OR REPLACE FUNCTION public.user_has_premium_access(
    p_user_id UUID DEFAULT NULL,
    p_required_tier TEXT DEFAULT 'premium'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_has_access BOOLEAN := false;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has active premium subscription
    SELECT EXISTS (
        SELECT 1 FROM public.premium_subscriptions ps
        WHERE ps.user_id = v_user_id
        AND ps.status = 'active'
        AND ps.current_period_end > NOW()
        AND (
            p_required_tier = 'premium' AND ps.tier IN ('premium', 'premium_plus', 'enterprise')
            OR p_required_tier = 'premium_plus' AND ps.tier IN ('premium_plus', 'enterprise')
            OR p_required_tier = 'enterprise' AND ps.tier = 'enterprise'
        )
    ) INTO v_has_access;
    
    RETURN v_has_access;
END;
$$;

-- Get available alumni perks for user
CREATE OR REPLACE FUNCTION public.get_available_alumni_perks(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_featured_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    perks JSONB,
    total_count INTEGER,
    has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_school_id UUID;
    v_perks JSONB;
    v_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get user's school
    SELECT school_id INTO v_user_school_id
    FROM public.profiles
    WHERE id = v_user_id;
    
    WITH filtered_perks AS (
        SELECT 
            ap.*,
            b.name as business_name,
            b.logo_url as business_logo,
            b.category as business_category,
            -- Check if user has already redeemed this perk
            EXISTS (
                SELECT 1 FROM public.perk_redemptions pr 
                WHERE pr.perk_id = ap.id AND pr.user_id = v_user_id
            ) as already_redeemed
        FROM public.alumni_perks ap
        LEFT JOIN public.businesses b ON ap.business_id = b.id
        WHERE 
            ap.is_active = true
            AND (ap.valid_until IS NULL OR ap.valid_until > NOW())
            AND (ap.valid_from IS NULL OR ap.valid_from <= NOW())
            AND (NOT p_featured_only OR ap.is_featured = true)
            -- School restrictions
            AND (
                ap.school_restrictions = '[]'::jsonb 
                OR ap.school_restrictions @> to_jsonb(v_user_school_id)
            )
            -- Usage limit check
            AND (ap.usage_limit IS NULL OR ap.usage_count < ap.usage_limit)
        ORDER BY 
            ap.is_featured DESC,
            ap.created_at DESC
        LIMIT p_limit + 1
        OFFSET p_offset
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', fp.id,
                'title', fp.title,
                'description', fp.description,
                'perk_type', fp.perk_type,
                'value_type', fp.value_type,
                'discount_value', fp.discount_value,
                'currency', fp.currency,
                'redemption_code', fp.redemption_code,
                'redemption_url', fp.redemption_url,
                'terms_conditions', fp.terms_conditions,
                'valid_until', fp.valid_until,
                'usage_limit', fp.usage_limit,
                'usage_count', fp.usage_count,
                'is_featured', fp.is_featured,
                'already_redeemed', fp.already_redeemed,
                'business', jsonb_build_object(
                    'name', fp.business_name,
                    'logo_url', fp.business_logo,
                    'category', fp.business_category
                )
            )
        ) as perk_data,
        COUNT(*) as perk_count
    INTO v_perks, v_count
    FROM filtered_perks fp;
    
    RETURN QUERY SELECT v_perks, v_count, (v_count > p_limit);
END;
$$;

-- Redeem an alumni perk
CREATE OR REPLACE FUNCTION public.redeem_alumni_perk(
    p_perk_id UUID,
    p_redemption_method TEXT DEFAULT 'website',
    p_redemption_details JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_perk_record RECORD;
    v_redemption_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get perk details and validate
    SELECT * INTO v_perk_record
    FROM public.alumni_perks
    WHERE id = p_perk_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perk not found or inactive';
    END IF;
    
    -- Check if perk is still valid
    IF v_perk_record.valid_until IS NOT NULL AND v_perk_record.valid_until < NOW() THEN
        RAISE EXCEPTION 'Perk has expired';
    END IF;
    
    -- Check usage limit
    IF v_perk_record.usage_limit IS NOT NULL AND v_perk_record.usage_count >= v_perk_record.usage_limit THEN
        RAISE EXCEPTION 'Perk usage limit reached';
    END IF;
    
    -- Check if user already redeemed this perk
    IF EXISTS (SELECT 1 FROM public.perk_redemptions WHERE perk_id = p_perk_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Perk already redeemed by user';
    END IF;
    
    -- Record the redemption
    INSERT INTO public.perk_redemptions (
        perk_id,
        user_id,
        redemption_method,
        redemption_details
    ) VALUES (
        p_perk_id,
        v_user_id,
        p_redemption_method,
        p_redemption_details
    )
    RETURNING id INTO v_redemption_id;
    
    -- Update usage count
    UPDATE public.alumni_perks
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = p_perk_id;
    
    -- Return redemption confirmation
    RETURN jsonb_build_object(
        'redemption_id', v_redemption_id,
        'perk_id', p_perk_id,
        'title', v_perk_record.title,
        'redemption_code', v_perk_record.redemption_code,
        'redemption_url', v_perk_record.redemption_url,
        'terms_conditions', v_perk_record.terms_conditions,
        'redeemed_at', NOW()
    );
END;
$$;

-- Create premium group
CREATE OR REPLACE FUNCTION public.create_premium_group(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_group_type TEXT DEFAULT 'premium',
    p_access_level TEXT DEFAULT 'subscription',
    p_subscription_tier_required TEXT DEFAULT NULL,
    p_price_cents INTEGER DEFAULT 0,
    p_member_limit INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_school_id UUID;
    v_group_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get user's school
    SELECT school_id INTO v_user_school_id
    FROM public.profiles
    WHERE id = v_user_id;
    
    -- Create the premium group
    INSERT INTO public.premium_groups (
        name,
        description,
        school_id,
        created_by,
        group_type,
        access_level,
        subscription_tier_required,
        price_cents,
        member_limit
    ) VALUES (
        p_name,
        p_description,
        v_user_school_id,
        v_user_id,
        p_group_type,
        p_access_level,
        p_subscription_tier_required,
        p_price_cents,
        p_member_limit
    )
    RETURNING id INTO v_group_id;
    
    -- Add creator as owner
    INSERT INTO public.premium_group_members (
        group_id,
        user_id,
        role,
        access_type,
        payment_status
    ) VALUES (
        v_group_id,
        v_user_id,
        'owner',
        'grandfathered',
        'paid'
    );
    
    RETURN v_group_id;
END;
$$;