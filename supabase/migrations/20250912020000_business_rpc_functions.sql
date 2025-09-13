-- Business Directory RPC Functions
-- Implements the functions called by the React hooks

-- =============================================
-- GET_BUSINESSES FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.get_businesses(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_category TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_verified_only BOOLEAN DEFAULT false,
    p_with_perks BOOLEAN DEFAULT false
)
RETURNS TABLE (
    businesses JSONB,
    total_count INTEGER,
    has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_count INTEGER;
    v_has_more BOOLEAN;
    v_businesses JSONB;
BEGIN
    -- Build base query
    WITH filtered_businesses AS (
        SELECT 
            b.*,
            CONCAT(p.first_name, ' ', p.last_name) as owner_name,
            p.avatar_url as owner_avatar,
            EXISTS (
                SELECT 1 FROM public.business_claims bc 
                WHERE bc.business_id = b.id 
                AND bc.user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')
            ) as has_claimed,
            (b.owner_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')) as is_owner
        FROM public.businesses b
        LEFT JOIN public.profiles p ON b.owner_id = p.id
        WHERE 1=1
        AND (p_category IS NULL OR b.category = p_category)
        AND (p_location IS NULL OR b.location ILIKE '%' || p_location || '%')
        AND (p_search IS NULL OR b.search @@ websearch_to_tsquery('english', p_search))
        AND (NOT p_verified_only OR b.verified = true)
        AND (NOT p_with_perks OR b.perk IS NOT NULL)
        ORDER BY 
            CASE WHEN b.is_premium THEN 0 ELSE 1 END,
            b.created_at DESC
    ),
    paginated_businesses AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'id', fb.id,
                    'owner_id', fb.owner_id,
                    'name', fb.name,
                    'description', fb.description,
                    'category', fb.category,
                    'website', fb.website,
                    'email', fb.email,
                    'phone', fb.phone,
                    'location', fb.location,
                    'address', fb.address,
                    'perk', fb.perk,
                    'perk_url', fb.perk_url,
                    'is_premium', fb.is_premium,
                    'verified', fb.verified,
                    'logo_url', fb.logo_url,
                    'images', fb.images,
                    'hours', fb.hours,
                    'social_links', fb.social_links,
                    'created_at', fb.created_at,
                    'updated_at', fb.updated_at,
                    'owner_name', fb.owner_name,
                    'owner_avatar', fb.owner_avatar,
                    'is_owner', fb.is_owner,
                    'has_claimed', fb.has_claimed
                )
            ) as businesses_data,
            COUNT(*) OVER() as total
        FROM filtered_businesses fb
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT 
        COALESCE(pb.businesses_data, '[]'::jsonb),
        COALESCE(pb.total, 0),
        (COALESCE(pb.total, 0) > p_offset + p_limit)
    INTO v_businesses, v_total_count, v_has_more
    FROM paginated_businesses pb;

    RETURN QUERY SELECT v_businesses, v_total_count, v_has_more;
END;
$$;

-- =============================================
-- CREATE_BUSINESS FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.create_business(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_website TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_address JSONB DEFAULT NULL,
    p_perk TEXT DEFAULT NULL,
    p_perk_url TEXT DEFAULT NULL,
    p_logo_url TEXT DEFAULT NULL,
    p_images TEXT[] DEFAULT NULL,
    p_hours JSONB DEFAULT NULL,
    p_social_links JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id UUID;
    v_result JSONB;
BEGIN
    -- Validate required fields
    IF p_name IS NULL OR p_name = '' THEN
        RAISE EXCEPTION 'Business name is required';
    END IF;

    -- Insert the business
    INSERT INTO public.businesses (
        name, description, category, website, email, phone, location,
        address, perk, perk_url, logo_url, images, hours, social_links
    ) VALUES (
        p_name, p_description, p_category, p_website, p_email, p_phone, p_location,
        p_address, p_perk, p_perk_url, p_logo_url, p_images, p_hours, p_social_links
    )
    RETURNING id INTO v_business_id;

    -- Return the created business
    SELECT jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'description', b.description,
        'category', b.category,
        'website', b.website,
        'email', b.email,
        'phone', b.phone,
        'location', b.location,
        'address', b.address,
        'perk', b.perk,
        'perk_url', b.perk_url,
        'is_premium', b.is_premium,
        'verified', b.verified,
        'logo_url', b.logo_url,
        'images', b.images,
        'hours', b.hours,
        'social_links', b.social_links,
        'created_at', b.created_at,
        'updated_at', b.updated_at
    )
    INTO v_result
    FROM public.businesses b
    WHERE b.id = v_business_id;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create business: %', SQLERRM;
END;
$$;

-- =============================================
-- CLAIM_BUSINESS FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.claim_business(
    p_business_id UUID,
    p_evidence_type TEXT,
    p_evidence_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_claim_id UUID;
    v_result JSONB;
    v_user_id UUID;
    v_existing_claim UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Check if business exists
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
        RAISE EXCEPTION 'Business not found';
    END IF;

    -- Check if user already has a pending or approved claim
    SELECT id INTO v_existing_claim
    FROM public.business_claims
    WHERE business_id = p_business_id AND user_id = v_user_id
    AND status IN ('pending', 'approved');

    IF v_existing_claim IS NOT NULL THEN
        RAISE EXCEPTION 'You already have a claim for this business';
    END IF;

    -- Validate evidence type
    IF p_evidence_type NOT IN ('website', 'email', 'document', 'social') THEN
        RAISE EXCEPTION 'Invalid evidence type';
    END IF;

    -- Create the claim
    INSERT INTO public.business_claims (
        business_id, user_id, evidence_type, evidence_data
    ) VALUES (
        p_business_id, v_user_id, p_evidence_type, p_evidence_data
    )
    RETURNING id INTO v_claim_id;

    -- Return success response
    v_result := jsonb_build_object(
        'success', true,
        'claim_id', v_claim_id,
        'message', 'Business claim submitted for review'
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to submit claim: %', SQLERRM;
END;
$$;

-- =============================================
-- GET_BUSINESS_CLAIMS FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.get_business_claims(
    p_business_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    claims JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_claims JSONB;
BEGIN
    -- Build query based on parameters
    WITH claim_data AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'id', bc.id,
                    'business_id', bc.business_id,
                    'user_id', bc.user_id,
                    'status', bc.status,
                    'evidence_type', bc.evidence_type,
                    'evidence_data', bc.evidence_data,
                    'reviewed_by', bc.reviewed_by,
                    'reviewed_at', bc.reviewed_at,
                    'notes', bc.notes,
                    'created_at', bc.created_at,
                    'updated_at', bc.updated_at,
                    'user', jsonb_build_object(
                        'display_name', p.display_name,
                        'avatar_url', p.avatar_url
                    ),
                    'business', jsonb_build_object(
                        'name', b.name
                    )
                )
            ) as claims_data
        FROM public.business_claims bc
        LEFT JOIN public.profiles p ON bc.user_id = p.id
        LEFT JOIN public.businesses b ON bc.business_id = b.id
        WHERE 1=1
        AND (p_business_id IS NULL OR bc.business_id = p_business_id)
        AND (p_status IS NULL OR bc.status = p_status)
        ORDER BY bc.created_at DESC
    )
    SELECT COALESCE(cd.claims_data, '[]'::jsonb)
    INTO v_claims
    FROM claim_data cd;

    RETURN QUERY SELECT v_claims;
END;
$$;

-- =============================================
-- UPDATE_BUSINESS_CLAIM FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_business_claim(
    p_claim_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_claim RECORD;
    v_result JSONB;
    v_reviewer_id UUID;
BEGIN
    -- Get current user ID (reviewer)
    v_reviewer_id := auth.uid();
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Validate status
    IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status';
    END IF;

    -- Get the claim
    SELECT * INTO v_claim
    FROM public.business_claims
    WHERE id = p_claim_id;

    IF v_claim IS NULL THEN
        RAISE EXCEPTION 'Claim not found';
    END IF;

    -- Update the claim
    UPDATE public.business_claims
    SET 
        status = p_status,
        reviewed_by = v_reviewer_id,
        reviewed_at = now(),
        notes = p_notes,
        updated_at = now()
    WHERE id = p_claim_id;

    -- If approved, update business ownership
    IF p_status = 'approved' THEN
        UPDATE public.businesses
        SET owner_id = v_claim.user_id,
            updated_at = now()
        WHERE id = v_claim.business_id;
    END IF;

    -- Return success response
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Claim updated successfully'
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update claim: %', SQLERRM;
END;
$$;

-- =============================================
-- SEARCH_BUSINESSES FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.search_businesses(
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    results JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_results JSONB;
BEGIN
    IF p_query IS NULL OR p_query = '' THEN
        RETURN QUERY SELECT '[]'::jsonb;
        RETURN;
    END IF;

    WITH search_results AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'id', b.id,
                    'name', b.name,
                    'description', b.description,
                    'category', b.category,
                    'location', b.location,
                    'logo_url', b.logo_url,
                    'verified', b.verified,
                    'is_premium', b.is_premium,
                    'perk', b.perk,
                    'search_rank', ts_rank(b.search, websearch_to_tsquery('english', p_query))
                ) ORDER BY 
                    ts_rank(b.search, websearch_to_tsquery('english', p_query)) DESC,
                    b.is_premium DESC,
                    b.verified DESC
            ) as results_data
        FROM public.businesses b
        WHERE b.search @@ websearch_to_tsquery('english', p_query)
        LIMIT p_limit
    )
    SELECT COALESCE(sr.results_data, '[]'::jsonb)
    INTO v_results
    FROM search_results sr;

    RETURN QUERY SELECT v_results;
END;
$$;

-- =============================================
-- GET_BUSINESS_CATEGORIES FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.get_business_categories()
RETURNS TABLE (
    categories TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT ARRAY(
        SELECT DISTINCT category
        FROM public.businesses
        WHERE category IS NOT NULL
        ORDER BY category
    );
END;
$$;

-- =============================================
-- GRANTS
-- =============================================
GRANT EXECUTE ON FUNCTION public.get_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_business TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_business TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_claims TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_claim TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_categories TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_businesses TO anon;
GRANT EXECUTE ON FUNCTION public.search_businesses TO anon;
GRANT EXECUTE ON FUNCTION public.get_business_categories TO anon;