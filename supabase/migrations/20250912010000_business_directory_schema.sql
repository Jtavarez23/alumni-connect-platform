-- Business Directory Schema
-- Creates tables and RLS policies for business listings and claims

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- BUSINESSES TABLE
-- =============================================
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    location TEXT,
    address JSONB DEFAULT '{}',
    perk TEXT,
    perk_url TEXT,
    is_premium BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    logo_url TEXT,
    images TEXT[] DEFAULT '{}',
    hours JSONB DEFAULT '{}',
    social_links JSONB DEFAULT '{}',
    search TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_website CHECK (website IS NULL OR website ~* '^https?://.*$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^[\d\s\-\(\)\+]+$')
);

-- =============================================
-- BUSINESS_CLAIMS TABLE
-- =============================================
CREATE TABLE public.business_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    evidence_type TEXT,
    evidence_data JSONB DEFAULT '{}',
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    UNIQUE(business_id, user_id),
    CONSTRAINT valid_evidence_type CHECK (evidence_type IS NULL OR evidence_type IN ('website', 'email', 'document', 'social'))
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX businesses_owner_id_idx ON public.businesses(owner_id);
CREATE INDEX businesses_category_idx ON public.businesses(category);
CREATE INDEX businesses_location_idx ON public.businesses(location);
CREATE INDEX businesses_is_premium_idx ON public.businesses(is_premium);
CREATE INDEX businesses_verified_idx ON public.businesses(verified);
CREATE INDEX businesses_search_idx ON public.businesses USING GIN(search);
CREATE INDEX businesses_created_at_idx ON public.businesses(created_at);

CREATE INDEX business_claims_business_id_idx ON public.business_claims(business_id);
CREATE INDEX business_claims_user_id_idx ON public.business_claims(user_id);
CREATE INDEX business_claims_status_idx ON public.business_claims(status);
CREATE INDEX business_claims_created_at_idx ON public.business_claims(created_at);

-- =============================================
-- TRIGGERS
-- =============================================
-- Update search vector on business changes
CREATE OR REPLACE FUNCTION public.update_business_search_vector() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.search = 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_search_vector_trigger
    BEFORE INSERT OR UPDATE OF name, description, category, location
    ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_business_search_vector();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_business_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER businesses_updated_at_trigger
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_business_updated_at();

CREATE TRIGGER business_claims_updated_at_trigger
    BEFORE UPDATE ON public.business_claims
    FOR EACH ROW
    EXECUTE FUNCTION public.update_business_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;

-- Businesses RLS Policies
-- Anyone can read businesses
CREATE POLICY "Anyone can view businesses" ON public.businesses
    FOR SELECT USING (true);

-- Authenticated users can create businesses
CREATE POLICY "Authenticated users can create businesses" ON public.businesses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Owners can update their businesses
CREATE POLICY "Business owners can update" ON public.businesses
    FOR UPDATE USING (owner_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.business_claims 
        WHERE business_id = id AND status = 'approved'
    ));

-- Owners can delete their businesses
CREATE POLICY "Business owners can delete" ON public.businesses
    FOR DELETE USING (owner_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.business_claims 
        WHERE business_id = id AND status = 'approved'
    ));

-- Business Claims RLS Policies
-- Anyone can view claims (for transparency)
CREATE POLICY "Anyone can view business claims" ON public.business_claims
    FOR SELECT USING (true);

-- Authenticated users can create claims
CREATE POLICY "Authenticated users can create claims" ON public.business_claims
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Users can update their own claims if pending
CREATE POLICY "Users can update their pending claims" ON public.business_claims
    FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

-- Users can delete their own claims if pending
CREATE POLICY "Users can delete their pending claims" ON public.business_claims
    FOR DELETE USING (user_id = auth.uid() AND status = 'pending');

-- Admins/moderators can manage all claims
CREATE POLICY "Admins can manage all claims" ON public.business_claims
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    ));

-- =============================================
-- GRANTS
-- =============================================
GRANT ALL ON public.businesses TO authenticated;
GRANT ALL ON public.business_claims TO authenticated;
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT ON public.business_claims TO anon;

-- =============================================
-- SEED DATA (Optional - for testing)
-- =============================================
INSERT INTO public.businesses (
    name, description, category, website, email, phone, location, 
    address, perk, perk_url, is_premium, verified, logo_url
) VALUES 
(
    'Alumni Coffee Co.',
    'Specialty coffee shop founded by Miami High alumni. Perfect spot for studying and networking.',
    'Restaurant',
    'https://alumnicoffee.com',
    'hello@alumnicoffee.com',
    '(305) 555-0123',
    'Miami, FL',
    '{"street": "123 Alumni Ave", "city": "Miami", "state": "FL", "zip": "33101", "country": "USA"}',
    '15% off all drinks for Miami High alumni',
    'https://alumnicoffee.com/alumni-perk',
    true,
    true,
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400'
),
(
    'Tech Solutions Inc.',
    'IT consulting and software development company run by 2005 graduates.',
    'Technology',
    'https://techsolutions.com',
    'info@techsolutions.com',
    '(305) 555-0456',
    'Miami, FL',
    '{"street": "456 Tech Blvd", "city": "Miami", "state": "FL", "zip": "33102", "country": "USA"}',
    'Free initial consultation for alumni startups',
    'https://techsolutions.com/alumni',
    false,
    true,
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400'
),
(
    'Sunrise Dental Care',
    'Comprehensive dental services with alumni discounts.',
    'Healthcare',
    'https://sunrisedental.com',
    'appointments@sunrisedental.com',
    '(305) 555-0789',
    'Miami Beach, FL',
    '{"street": "789 Beach Dr", "city": "Miami Beach", "state": "FL", "zip": "33139", "country": "USA"}',
    '20% off dental services for alumni and family',
    'https://sunrisedental.com/alumni-discount',
    true,
    false,
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400'
);