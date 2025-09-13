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

async function addSampleData() {
  console.log('📊 Adding sample data for connections and events...\n');
  
  const sampleDataSQL = `
    -- Sample connections data
    INSERT INTO public.connections (user_id, connection_id, status, created_at)
    VALUES 
    (
      'b99870dc-6821-4b7b-985b-02c0df497b69',
      '11111111-1111-1111-1111-111111111111',
      'accepted',
      now() - interval '2 days'
    ),
    (
      'b99870dc-6821-4b7b-985b-02c0df497b69', 
      '22222222-2222-2222-2222-222222222222',
      'accepted',
      now() - interval '5 days'
    ),
    (
      'b99870dc-6821-4b7b-985b-02c0df497b69',
      '33333333-3333-3333-3333-333333333333',
      'pending',
      now() - interval '1 day'
    )
    ON CONFLICT (user_id, connection_id) DO NOTHING;

    -- Sample events data
    INSERT INTO public.events (
      host_type, host_id, title, description, 
      starts_at, ends_at, location, is_virtual,
      visibility, created_by
    )
    VALUES 
    (
      'school',
      'c9052f67-a349-4f89-8e02-e0fc453fc09c',
      'Alumni Homecoming 2024',
      'Annual homecoming event for all alumni. Food, drinks, and networking!',
      now() + interval '7 days',
      now() + interval '7 days 4 hours',
      'School Main Campus',
      false,
      'alumni_only',
      'b99870dc-6821-4b7b-985b-02c0df497b69'
    ),
    (
      'user',
      'b99870dc-6821-4b7b-985b-02c0df497b69',
      'Tech Industry Networking',
      'Networking event for alumni in the technology industry',
      now() + interval '3 days',
      now() + interval '3 days 3 hours',
      'Virtual Meeting',
      true,
      'public',
      'b99870dc-6821-4b7b-985b-02c0df497b69'
    )
    ON CONFLICT DO NOTHING;

    -- Sample event attendees
    INSERT INTO public.event_attendees (event_id, user_id, status)
    SELECT 
      e.id as event_id,
      'b99870dc-6821-4b7b-985b-02c0df497b69' as user_id,
      'going' as status
    FROM public.events e
    WHERE e.title = 'Alumni Homecoming 2024'
    ON CONFLICT (event_id, user_id) DO NOTHING;

    -- Sample posts for testing feed functions
    INSERT INTO public.posts (user_id, content, visibility, media_urls)
    VALUES 
    (
      'b99870dc-6821-4b7b-985b-02c0df497b69',
      'Excited for the upcoming alumni homecoming event! Who else is going?',
      'public',
      '[]'
    ),
    (
      '11111111-1111-1111-1111-111111111111',
      'Just launched my new startup! Looking for talented alumni to join the team.',
      'alumni_only',
      '[]'
    )
    ON CONFLICT DO NOTHING;

    -- Validation queries
    DO $$
    BEGIN
      -- Check connections were added
      ASSERT (SELECT COUNT(*) FROM public.connections) >= 3, 'Sample connections not added';
      
      -- Check events were added  
      ASSERT (SELECT COUNT(*) FROM public.events) >= 2, 'Sample events not added';
      
      -- Check attendees were added
      ASSERT (SELECT COUNT(*) FROM public.event_attendees) >= 1, 'Sample attendees not added';
      
      -- Check posts were added
      ASSERT (SELECT COUNT(*) FROM public.posts) >= 2, 'Sample posts not added';
      
      RAISE NOTICE 'Sample data added successfully!';
    END$$;
  `;
  
  try {
    console.log('Adding sample connections, events, and posts...');
    const { error } = await supabase.rpc('exec_sql', { sql: sampleDataSQL });
    
    if (error) {
      console.log('❌ Error adding sample data:', error.message);
      
      // Try simpler approach without assertions
      const simpleSampleSQL = `
        -- Simple connections
        INSERT INTO public.connections (user_id, connection_id, status, created_at)
        SELECT 
          'b99870dc-6821-4b7b-985b-02c0df497b69',
          gen_random_uuid(),
          'accepted',
          now() - interval '2 days'
        WHERE NOT EXISTS (SELECT 1 FROM public.connections LIMIT 1);

        -- Simple event
        INSERT INTO public.events (host_type, host_id, title, starts_at, visibility, created_by)
        SELECT 
          'school',
          'c9052f67-a349-4f89-8e02-e0fc453fc09c',
          'Test Alumni Event',
          now() + interval '7 days',
          'alumni_only',
          'b99870dc-6821-4b7b-985b-02c0df497b69'
        WHERE NOT EXISTS (SELECT 1 FROM public.events LIMIT 1);
      `;
      
      const { error: simpleError } = await supabase.rpc('exec_sql', { sql: simpleSampleSQL });
      if (simpleError) {
        console.log('❌ Simple sample data also failed:', simpleError.message);
      } else {
        console.log('✅ Minimal sample data added');
      }
      
    } else {
      console.log('✅ Sample data added successfully!');
      
      // Verify the data was added
      const { count: connectionsCount } = await supabase.from('connections').select('*', { count: 'exact', head: true });
      const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
      
      console.log(`📊 Connections: ${connectionsCount} records`);
      console.log(`📊 Events: ${eventsCount} records`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

addSampleData();