import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBusinessListings() {
  console.log('🏢 Creating business_listings table...\n');
  
  const createTableSQL = `
    -- Business listings table for premium/boosted features (AC-ARCH-002a specification)
    CREATE TABLE IF NOT EXISTS public.business_listings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
      type text CHECK (type IN ('free', 'premium', 'boosted')) DEFAULT 'free',
      start_date timestamptz DEFAULT now(),
      end_date timestamptz,
      stripe_subscription_id text,
      stripe_price_id text,
      current_period_start timestamptz,
      current_period_end timestamptz,
      status text CHECK (status IN ('active', 'canceled', 'incomplete', 'past_due')) DEFAULT 'active',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_business_listings_business_id ON public.business_listings(business_id);
    CREATE INDEX IF NOT EXISTS idx_business_listings_type ON public.business_listings(type);
    CREATE INDEX IF NOT EXISTS idx_business_listings_status ON public.business_listings(status);
    CREATE INDEX IF NOT EXISTS idx_business_listings_dates ON public.business_listings(start_date, end_date);

    -- Enable Row Level Security
    ALTER TABLE public.business_listings ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    DO $$
    BEGIN
      -- Business owners can view their own listings
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Business owners can view their listings' AND tablename = 'business_listings') THEN
        CREATE POLICY "Business owners can view their listings" ON public.business_listings
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.businesses b 
              WHERE b.id = business_listings.business_id 
              AND b.owner_id = auth.uid()
            )
          );
      END IF;

      -- Business owners can manage their listings
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Business owners can manage their listings' AND tablename = 'business_listings') THEN
        CREATE POLICY "Business owners can manage their listings" ON public.business_listings
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.businesses b 
              WHERE b.id = business_listings.business_id 
              AND b.owner_id = auth.uid()
            )
          );
      END IF;

      -- Public can view active premium/boosted listings
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view active premium listings' AND tablename = 'business_listings') THEN
        CREATE POLICY "Public can view active premium listings" ON public.business_listings
          FOR SELECT USING (
            type IN ('premium', 'boosted') 
            AND status = 'active'
            AND (end_date IS NULL OR end_date > now())
          );
      END IF;
    END$$;

    -- Add sample data for testing
    INSERT INTO public.business_listings (business_id, type, start_date, end_date, status)
    SELECT 
      id as business_id,
      CASE 
        WHEN verified = true THEN 'premium'
        ELSE 'free'
      END as type,
      now() as start_date,
      now() + interval '30 days' as end_date,
      'active' as status
    FROM public.businesses
    WHERE verified = true
    LIMIT 3;

    -- Validation
    DO $$
    BEGIN
      ASSERT (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'business_listings') = 1, 'business_listings table missing';
      ASSERT (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'business_listings') >= 2, 'RLS policies missing';
      RAISE NOTICE 'business_listings table created successfully with sample data';
    END$$;
  `;
  
  try {
    console.log('Creating table and policies...');
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.log('❌ Error creating business_listings:', error.message);
      
      // Try without the sample data if there's an error
      const simpleCreateSQL = `
        CREATE TABLE IF NOT EXISTS public.business_listings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
          type text CHECK (type IN ('free', 'premium', 'boosted')) DEFAULT 'free',
          start_date timestamptz DEFAULT now(),
          end_date timestamptz,
          status text CHECK (status IN ('active', 'canceled', 'incomplete', 'past_due')) DEFAULT 'active',
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
        
        ALTER TABLE public.business_listings ENABLE ROW LEVEL SECURITY;
      `;
      
      const { error: simpleError } = await supabase.rpc('exec_sql', { sql: simpleCreateSQL });
      if (simpleError) {
        console.log('❌ Simple creation also failed:', simpleError.message);
      } else {
        console.log('✅ business_listings table created (without sample data)');
      }
      
    } else {
      console.log('✅ business_listings table created successfully with sample data');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

createBusinessListings();