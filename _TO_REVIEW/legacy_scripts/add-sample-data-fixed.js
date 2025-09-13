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

async function addSampleDataFixed() {
  console.log('📊 Adding sample data (fixed version)...\n');
  
  // First, let's get some existing user IDs to use for connections
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .neq('id', 'b99870dc-6821-4b7b-985b-02c0df497b69')
    .limit(2);
  
  if (profilesError || !profiles || profiles.length < 2) {
    console.log('❌ Not enough profiles for connections. Creating test posts instead...');
    
    // Add sample posts instead
    const postsSQL = `
      INSERT INTO public.posts (user_id, content, visibility, media_urls)
      VALUES 
      (
        'b99870dc-6821-4b7b-985b-02c0df497b69',
        'Excited for the upcoming alumni events! This platform is amazing.',
        'public',
        '[]'
      ),
      (
        'b99870dc-6821-4b7b-985b-02c0df497b69',
        'Looking to connect with other alumni in the tech industry. DM me!',
        'alumni_only',
        '[]'
      )
      ON CONFLICT DO NOTHING;

      -- Create a test event
      INSERT INTO public.events (
        host_type, host_id, title, description, 
        starts_at, ends_at, location, is_virtual,
        visibility, created_by
      )
      SELECT 
        'school',
        (SELECT id FROM public.schools LIMIT 1),
        'Alumni Networking Mixer',
        'Casual networking event for all alumni to connect and share experiences',
        now() + interval '5 days',
        now() + interval '5 days 3 hours',
        'Virtual Meeting Room',
        true,
        'alumni_only',
        'b99870dc-6821-4b7b-985b-02c0df497b69'
      WHERE NOT EXISTS (SELECT 1 FROM public.events WHERE title = 'Alumni Networking Mixer');

      -- Add current user as attendee
      INSERT INTO public.event_attendees (event_id, user_id, status)
      SELECT 
        e.id,
        'b99870dc-6821-4b7b-985b-02c0df497b69',
        'going'
      FROM public.events e
      WHERE e.title = 'Alumni Networking Mixer'
      ON CONFLICT (event_id, user_id) DO NOTHING;
    `;
    
    const { error: postsError } = await supabase.rpc('exec_sql', { sql: postsSQL });
    if (postsError) {
      console.log('❌ Error adding posts and events:', postsError.message);
    } else {
      console.log('✅ Sample posts and event created successfully!');
    }
    
    return;
  }
  
  // Use existing profile IDs for connections
  const [profile1, profile2] = profiles;
  
  const sampleDataSQL = `
    -- Sample connections using real profile IDs
    INSERT INTO public.connections (user_id, connection_id, status, created_at)
    VALUES 
    (
      'b99870dc-6821-4b7b-985b-02c0df497b69',
      '${profile1.id}',
      'accepted',
      now() - interval '2 days'
    ),
    (
      'b99870dc-6821-4b7b-985b-02c0df497b69', 
      '${profile2.id}',
      'accepted',
      now() - interval '5 days'
    )
    ON CONFLICT (user_id, connection_id) DO NOTHING;

    -- Sample events
    INSERT INTO public.events (
      host_type, host_id, title, description, 
      starts_at, ends_at, location, is_virtual,
      visibility, created_by
    )
    VALUES 
    (
      'school',
      (SELECT id FROM public.schools LIMIT 1),
      'Alumni Homecoming 2024',
      'Annual homecoming event for all alumni. Food, drinks, and networking!',
      now() + interval '7 days',
      now() + interval '7 days 4 hours',
      'School Main Campus',
      false,
      'alumni_only',
      'b99870dc-6821-4b7b-985b-02c0df497b69'
    )
    ON CONFLICT DO NOTHING;

    -- Sample posts
    INSERT INTO public.posts (user_id, content, visibility, media_urls)
    VALUES 
    (
      'b99870dc-6821-4b7b-985b-02c0df497b69',
      'Excited for the upcoming alumni homecoming event! Who else is going?',
      'public',
      '[]'
    )
    ON CONFLICT DO NOTHING;
  `;
  
  try {
    console.log('Adding sample data with valid user IDs...');
    const { error } = await supabase.rpc('exec_sql', { sql: sampleDataSQL });
    
    if (error) {
      console.log('❌ Error adding sample data:', error.message);
    } else {
      console.log('✅ Sample data added successfully!');
      
      // Verify the data
      const { count: connectionsCount } = await supabase.from('connections').select('*', { count: 'exact', head: true });
      const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
      const { count: postsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      
      console.log(`📊 Connections: ${connectionsCount} records`);
      console.log(`📊 Events: ${eventsCount} records`);
      console.log(`📊 Posts: ${postsCount} records`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

addSampleDataFixed();