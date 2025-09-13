-- Premium Subscription System RPC Functions
-- Functions to support premium subscription management and billing
-- Part of Sprint 6: Premium Features & Monetization

-- =============================================
-- SUBSCRIPTION TIER FUNCTIONS
-- =============================================

-- Function to get all available subscription tiers
CREATE OR REPLACE FUNCTION public.get_subscription_tiers()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    description TEXT,
    price_monthly DECIMAL,
    price_yearly DECIMAL,
    currency TEXT,
    features TEXT[],
    is_popular BOOLEAN,
    max_premium_groups INTEGER,
    max_monthly_events INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tier as id,
        CASE tier
            WHEN 'premium' THEN 'Premium'
            WHEN 'premium_plus' THEN 'Premium Plus'
            WHEN 'enterprise' THEN 'Enterprise'
        END as name,
        CASE tier
            WHEN 'premium' THEN 'Essential premium features for active alumni'
            WHEN 'premium_plus' THEN 'Advanced features for alumni leaders'
            WHEN 'enterprise' THEN 'Full enterprise features for organizations'
        END as description,
        CASE tier
            WHEN 'premium' THEN 9.99::decimal
            WHEN 'premium_plus' THEN 19.99::decimal  
            WHEN 'enterprise' THEN 49.99::decimal
        END as price_monthly,
        CASE tier
            WHEN 'premium' THEN 99.99::decimal
            WHEN 'premium_plus' THEN 199.99::decimal
            WHEN 'enterprise' THEN 499.99::decimal
        END as price_yearly,
        'USD' as currency,
        CASE tier
            WHEN 'premium' THEN ARRAY['Create premium groups', 'Access exclusive perks', 'Priority support']
            WHEN 'premium_plus' THEN ARRAY['All Premium features', 'Host premium events', 'Advanced analytics', 'Custom branding']
            WHEN 'enterprise' THEN ARRAY['All Premium Plus features', 'Unlimited premium groups', 'Unlimited premium events', 'Dedicated support', 'Custom integrations']
        END as features,
        CASE tier
            WHEN 'premium_plus' THEN true
            ELSE false
        END as is_popular,
        CASE tier
            WHEN 'premium' THEN 3
            WHEN 'premium_plus' THEN 10
            WHEN 'enterprise' THEN NULL
        END as max_premium_groups,
        CASE tier
            WHEN 'premium' THEN 5
            WHEN 'premium_plus' THEN 20
            WHEN 'enterprise' THEN NULL
        END as max_monthly_events
    FROM (VALUES ('premium'), ('premium_plus'), ('enterprise')) AS tiers(tier);
END;
$$;

-- Function to get user's current subscription
CREATE OR REPLACE FUNCTION public.get_user_subscription()
RETURNS TABLE (
    id UUID,
    tier_id TEXT,
    status TEXT,
    billing_cycle TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN,
    stripe_subscription_id TEXT,
    tier JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        ps.id,
        ps.tier as tier_id,
        ps.status,
        ps.billing_cycle,
        ps.current_period_start,
        ps.current_period_end,
        ps.cancel_at_period_end,
        ps.stripe_subscription_id,
        jsonb_build_object(
            'id', ps.tier,
            'name', CASE ps.tier
                WHEN 'premium' THEN 'Premium'
                WHEN 'premium_plus' THEN 'Premium Plus'
                WHEN 'enterprise' THEN 'Enterprise'
            END,
            'description', CASE ps.tier
                WHEN 'premium' THEN 'Essential premium features for active alumni'
                WHEN 'premium_plus' THEN 'Advanced features for alumni leaders'
                WHEN 'enterprise' THEN 'Full enterprise features for organizations'
            END,
            'price_monthly', CASE ps.tier
                WHEN 'premium' THEN 9.99
                WHEN 'premium_plus' THEN 19.99
                WHEN 'enterprise' THEN 49.99
            END,
            'price_yearly', CASE ps.tier
                WHEN 'premium' THEN 99.99
                WHEN 'premium_plus' THEN 199.99
                WHEN 'enterprise' THEN 499.99
            END,
            'currency', 'USD',
            'features', CASE ps.tier
                WHEN 'premium' THEN ARRAY['Create premium groups', 'Access exclusive perks', 'Priority support']
                WHEN 'premium_plus' THEN ARRAY['All Premium features', 'Host premium events', 'Advanced analytics', 'Custom branding']
                WHEN 'enterprise' THEN ARRAY['All Premium Plus features', 'Unlimited premium groups', 'Unlimited premium events', 'Dedicated support', 'Custom integrations']
            END,
            'is_popular', CASE ps.tier
                WHEN 'premium_plus' THEN true
                ELSE false
            END,
            'max_premium_groups', CASE ps.tier
                WHEN 'premium' THEN 3
                WHEN 'premium_plus' THEN 10
                WHEN 'enterprise' THEN NULL
            END,
            'max_monthly_events', CASE ps.tier
                WHEN 'premium' THEN 5
                WHEN 'premium_plus' THEN 20
                WHEN 'enterprise' THEN NULL
            END
        ) as tier
    FROM public.premium_subscriptions ps
    WHERE ps.user_id = v_user_id 
    AND ps.status IN ('active', 'pending')
    ORDER BY ps.created_at DESC
    LIMIT 1;
END;
$$;

-- =============================================
-- SUBSCRIPTION MANAGEMENT FUNCTIONS
-- =============================================

-- Function to create or update user subscription
CREATE OR REPLACE FUNCTION public.upsert_user_subscription(
    p_tier TEXT,
    p_status TEXT DEFAULT 'active',
    p_billing_cycle TEXT DEFAULT 'monthly',
    p_stripe_subscription_id TEXT DEFAULT NULL,
    p_current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 month'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Deactivate any existing subscriptions
    UPDATE public.premium_subscriptions
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = v_user_id AND status IN ('active', 'pending');
    
    -- Create new subscription
    INSERT INTO public.premium_subscriptions (
        user_id,
        tier,
        status,
        billing_cycle,
        stripe_subscription_id,
        current_period_start,
        current_period_end
    ) VALUES (
        v_user_id,
        p_tier,
        p_status,
        p_billing_cycle,
        p_stripe_subscription_id,
        p_current_period_start,
        p_current_period_end
    )
    RETURNING id INTO v_subscription_id;
    
    RETURN v_subscription_id;
END;
$$;

-- Function to cancel user subscription
CREATE OR REPLACE FUNCTION public.cancel_user_subscription()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_rows_updated INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    UPDATE public.premium_subscriptions
    SET 
        cancel_at_period_end = true,
        updated_at = NOW()
    WHERE user_id = v_user_id 
    AND status IN ('active', 'pending');
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    RETURN v_rows_updated > 0;
END;
$$;

-- Function to update subscription from Stripe webhook
CREATE OR REPLACE FUNCTION public.update_subscription_from_webhook(
    p_stripe_subscription_id TEXT,
    p_status TEXT,
    p_current_period_start TIMESTAMP WITH TIME ZONE,
    p_current_period_end TIMESTAMP WITH TIME ZONE,
    p_cancel_at_period_end BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_updated INTEGER;
BEGIN
    UPDATE public.premium_subscriptions
    SET 
        status = p_status,
        current_period_start = p_current_period_start,
        current_period_end = p_current_period_end,
        cancel_at_period_end = p_cancel_at_period_end,
        updated_at = NOW()
    WHERE stripe_subscription_id = p_stripe_subscription_id;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    RETURN v_rows_updated > 0;
END;
$$;

-- =============================================
-- PREMIUM GROUPS FUNCTIONS
-- =============================================

-- Function to get user's premium groups
CREATE OR REPLACE FUNCTION public.get_user_premium_groups()
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    description TEXT,
    member_count INTEGER,
    max_members INTEGER,
    is_private BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        pg.id,
        pg.name,
        pg.description,
        pg.member_count,
        pg.max_members,
        pg.is_private,
        pg.created_at
    FROM public.premium_groups pg
    WHERE pg.owner_id = v_user_id
    ORDER BY pg.created_at DESC;
END;
$$;

-- Function to create premium group
CREATE OR REPLACE FUNCTION public.create_premium_group(
    p_name VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_max_members INTEGER DEFAULT 100,
    p_is_private BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_group_id UUID;
    v_subscription RECORD;
    v_current_groups INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Check if user has an active premium subscription
    SELECT tier_id, max_premium_groups INTO v_subscription
    FROM public.get_user_subscription()
    LIMIT 1;
    
    IF v_subscription IS NULL THEN
        RAISE EXCEPTION 'Premium subscription required to create premium groups';
    END IF;
    
    -- Check current group count against limit
    SELECT COUNT(*) INTO v_current_groups
    FROM public.premium_groups
    WHERE owner_id = v_user_id;
    
    IF v_subscription.max_premium_groups IS NOT NULL 
       AND v_current_groups >= v_subscription.max_premium_groups THEN
        RAISE EXCEPTION 'Premium group limit reached for your subscription tier';
    END IF;
    
    -- Create the premium group
    INSERT INTO public.premium_groups (
        owner_id,
        name,
        description,
        max_members,
        is_private
    ) VALUES (
        v_user_id,
        p_name,
        p_description,
        p_max_members,
        p_is_private
    )
    RETURNING id INTO v_group_id;
    
    RETURN v_group_id;
END;
$$;

-- =============================================
-- ALUMNI PERKS FUNCTIONS
-- =============================================

-- Function to get available alumni perks
CREATE OR REPLACE FUNCTION public.get_available_alumni_perks(
    p_limit INTEGER DEFAULT 50,
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
    v_perks JSONB;
    v_total INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get total count
    SELECT COUNT(*) INTO v_total
    FROM public.alumni_perks ap
    JOIN public.businesses b ON ap.business_id = b.id
    WHERE ap.is_active = true
    AND (NOT p_featured_only OR ap.is_featured = true)
    AND (ap.valid_until IS NULL OR ap.valid_until > NOW())
    AND (ap.usage_limit IS NULL OR ap.usage_count < ap.usage_limit);
    
    -- Get perks with business info and redemption status
    WITH perk_data AS (
        SELECT 
            ap.id,
            ap.title,
            ap.description,
            ap.perk_type,
            ap.value_type,
            ap.discount_value,
            ap.currency,
            ap.redemption_code,
            ap.redemption_url,
            ap.terms_conditions,
            ap.valid_until,
            ap.usage_limit,
            ap.usage_count,
            ap.is_featured,
            -- Check if user already redeemed this perk
            CASE 
                WHEN apr.id IS NOT NULL THEN true 
                ELSE false 
            END as already_redeemed,
            -- Business info
            jsonb_build_object(
                'name', b.name,
                'logo_url', b.logo_url,
                'category', b.category
            ) as business
        FROM public.alumni_perks ap
        JOIN public.businesses b ON ap.business_id = b.id
        LEFT JOIN public.alumni_perk_redemptions apr ON (
            ap.id = apr.perk_id AND apr.user_id = v_user_id
        )
        WHERE ap.is_active = true
        AND (NOT p_featured_only OR ap.is_featured = true)
        AND (ap.valid_until IS NULL OR ap.valid_until > NOW())
        AND (ap.usage_limit IS NULL OR ap.usage_count < ap.usage_limit)
        ORDER BY ap.is_featured DESC, ap.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', pd.id,
            'title', pd.title,
            'description', pd.description,
            'perk_type', pd.perk_type,
            'value_type', pd.value_type,
            'discount_value', pd.discount_value,
            'currency', pd.currency,
            'redemption_code', pd.redemption_code,
            'redemption_url', pd.redemption_url,
            'terms_conditions', pd.terms_conditions,
            'valid_until', pd.valid_until,
            'usage_limit', pd.usage_limit,
            'usage_count', pd.usage_count,
            'is_featured', pd.is_featured,
            'already_redeemed', pd.already_redeemed,
            'business', pd.business
        )
    ) INTO v_perks
    FROM perk_data pd;
    
    RETURN QUERY SELECT 
        COALESCE(v_perks, '[]'::jsonb) as perks,
        v_total as total_count,
        (p_offset + p_limit < v_total) as has_more;
END;
$$;

-- Function to redeem alumni perk
CREATE OR REPLACE FUNCTION public.redeem_alumni_perk(
    p_perk_id UUID,
    p_redemption_method TEXT DEFAULT 'website'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_perk RECORD;
    v_redemption_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get perk details and check availability
    SELECT ap.*, b.name as business_name
    INTO v_perk
    FROM public.alumni_perks ap
    JOIN public.businesses b ON ap.business_id = b.id
    WHERE ap.id = p_perk_id 
    AND ap.is_active = true
    AND (ap.valid_until IS NULL OR ap.valid_until > NOW())
    AND (ap.usage_limit IS NULL OR ap.usage_count < ap.usage_limit);
    
    IF v_perk IS NULL THEN
        RAISE EXCEPTION 'Perk not available for redemption';
    END IF;
    
    -- Check if already redeemed by this user
    IF EXISTS (
        SELECT 1 FROM public.alumni_perk_redemptions 
        WHERE perk_id = p_perk_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Perk already redeemed by this user';
    END IF;
    
    -- Record the redemption
    INSERT INTO public.alumni_perk_redemptions (
        user_id,
        perk_id,
        redemption_method,
        metadata
    ) VALUES (
        v_user_id,
        p_perk_id,
        p_redemption_method,
        jsonb_build_object(
            'business_name', v_perk.business_name,
            'perk_title', v_perk.title
        )
    )
    RETURNING id INTO v_redemption_id;
    
    -- Update usage count
    UPDATE public.alumni_perks
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = p_perk_id;
    
    RETURN jsonb_build_object(
        'redemption_id', v_redemption_id,
        'title', v_perk.title,
        'business_name', v_perk.business_name,
        'redemption_code', v_perk.redemption_code,
        'redemption_url', v_perk.redemption_url
    );
END;
$$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_subscription_tiers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_subscription(TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_user_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_subscription_from_webhook(TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_premium_groups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_premium_group(VARCHAR(255), TEXT, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_alumni_perks(INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_alumni_perk(UUID, TEXT) TO authenticated;