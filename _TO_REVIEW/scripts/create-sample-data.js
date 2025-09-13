import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const process = { env: {} };
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.trim().replace(/"/g, '');
  }
});

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleData() {
  console.log('🎓 Creating Sample Data for V2 Testing...\n');
  
  try {
    // 1. Create sample schools
    console.log('📚 Creating sample schools...');
    const { data: schools, error: schoolError } = await supabase
      .from('schools')
      .upsert([
        {
          name: 'Roosevelt High School',
          location: 'Chicago, IL',
          school_type: 'high_school',
          founded_year: 1922,
          mascot: 'Eagles',
          colors: '["blue", "gold"]'
        },
        {
          name: 'Stanford University', 
          location: 'Stanford, CA',
          school_type: 'university',
          founded_year: 1885,
          mascot: 'Cardinal',
          colors: '["cardinal", "white"]'
        },
        {
          name: 'Lincoln Middle School',
          location: 'Springfield, IL',
          school_type: 'middle_school', 
          founded_year: 1965,
          mascot: 'Lions',
          colors: '["green", "white"]'
        }
      ], { 
        onConflict: 'name,location',
        returning: 'representation' 
      });

    if (schoolError) {
      console.error('School creation error:', schoolError);
      return;
    }
    
    console.log(`✅ Created ${schools?.length || 0} schools`);

    // 2. Create sample profiles with different subscription tiers
    console.log('\n👥 Creating sample users...');
    
    const sampleUsers = [
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.j@test.com',
        subscription_tier: 'free',
        bio: 'Class president, loves photography'
      },
      {
        first_name: 'Mike',
        last_name: 'Chen', 
        email: 'mike.c@test.com',
        subscription_tier: 'premium',
        bio: 'Basketball captain, now software engineer'
      },
      {
        first_name: 'Emma',
        last_name: 'Davis',
        email: 'emma.d@test.com', 
        subscription_tier: 'free',
        bio: 'Drama club, theater major'
      },
      {
        first_name: 'Alex',
        last_name: 'Rodriguez',
        email: 'alex.r@test.com',
        subscription_tier: 'enterprise',
        bio: 'School administrator, education advocate'
      }
    ];

    for (const user of sampleUsers) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert([user], { onConflict: 'email' });
        
      if (error) {
        console.log(`⚠️ User creation skipped: ${user.first_name} ${user.last_name}`);
      } else {
        console.log(`✅ Created user: ${user.first_name} ${user.last_name} (${user.subscription_tier})`);
      }
    }

    // 3. Create user education records
    console.log('\n🎓 Creating education histories...');
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, subscription_tier');
      
    const { data: schoolList } = await supabase
      .from('schools')
      .select('id, name');

    if (profiles && schoolList && profiles.length > 0 && schoolList.length > 0) {
      const educationRecords = [];
      
      // Sarah - Roosevelt High School graduate
      educationRecords.push({
        user_id: profiles[0].id,
        school_id: schoolList.find(s => s.name.includes('Roosevelt'))?.id,
        start_year: 2018,
        end_year: 2022,
        is_primary: true,
        role_type: 'student'
      });

      // Mike - Roosevelt High + Stanford University  
      educationRecords.push({
        user_id: profiles[1].id,
        school_id: schoolList.find(s => s.name.includes('Roosevelt'))?.id,
        start_year: 2017,
        end_year: 2021,
        is_primary: true,
        role_type: 'student'
      });
      
      educationRecords.push({
        user_id: profiles[1].id,
        school_id: schoolList.find(s => s.name.includes('Stanford'))?.id,
        start_year: 2021,
        end_year: 2025,
        is_primary: false,
        role_type: 'student'
      });

      // Emma - Lincoln Middle + Roosevelt High
      educationRecords.push({
        user_id: profiles[2].id,
        school_id: schoolList.find(s => s.name.includes('Lincoln'))?.id,
        start_year: 2015,
        end_year: 2018,
        is_primary: false,
        role_type: 'student'
      });
      
      educationRecords.push({
        user_id: profiles[2].id,
        school_id: schoolList.find(s => s.name.includes('Roosevelt'))?.id,
        start_year: 2018,
        end_year: 2022,
        is_primary: true,
        role_type: 'student'
      });

      const { error: eduError } = await supabase
        .from('user_education')
        .upsert(educationRecords.filter(r => r.school_id), { 
          onConflict: 'user_id,school_id,start_year' 
        });

      if (eduError) {
        console.error('Education records error:', eduError);
      } else {
        console.log(`✅ Created ${educationRecords.length} education records`);
      }
    }

    // 4. Initialize search quotas
    console.log('\n🔍 Setting up search quotas...');
    
    if (profiles) {
      const quotaRecords = profiles.map(profile => ({
        user_id: profile.id,
        date: new Date().toISOString().split('T')[0],
        searches_used: Math.floor(Math.random() * 2), // 0-1 searches used
        search_limit: profile.subscription_tier === 'premium' ? 999999 : 3,
        earned_searches: 0
      }));

      const { error: quotaError } = await supabase
        .from('search_quotas')
        .upsert(quotaRecords, { onConflict: 'user_id,date' });

      if (quotaError) {
        console.error('Search quota error:', quotaError);
      } else {
        console.log(`✅ Initialized search quotas for ${quotaRecords.length} users`);
      }
    }

    // 5. Create some friendships and messaging permissions
    console.log('\n🤝 Creating sample friendships...');
    
    if (profiles && profiles.length >= 2) {
      const friendshipRecords = [
        {
          requester_id: profiles[0].id,
          addressee_id: profiles[1].id,
          status: 'accepted',
          created_at: new Date().toISOString()
        },
        {
          requester_id: profiles[0].id,
          addressee_id: profiles[2].id, 
          status: 'accepted',
          created_at: new Date().toISOString()
        }
      ];

      const { error: friendError } = await supabase
        .from('friendships')
        .upsert(friendshipRecords, { onConflict: 'requester_id,addressee_id' });

      if (!friendError) {
        console.log(`✅ Created ${friendshipRecords.length} friendships`);
        
        // Create messaging permissions
        const messagingRecords = [];
        friendshipRecords.forEach(f => {
          messagingRecords.push({
            sender_id: f.requester_id,
            recipient_id: f.addressee_id,
            can_message: true,
            reason: 'mutual_connection'
          });
          messagingRecords.push({
            sender_id: f.addressee_id,
            recipient_id: f.requester_id,
            can_message: true,
            reason: 'mutual_connection'
          });
        });

        const { error: msgError } = await supabase
          .from('messaging_permissions')
          .upsert(messagingRecords, { onConflict: 'sender_id,recipient_id' });

        if (!msgError) {
          console.log(`✅ Created messaging permissions`);
        }
      }
    }

    // 6. Test V2 functions
    console.log('\n🧪 Testing V2 functions...');
    
    if (profiles && profiles.length > 0) {
      // Test premium features function
      const { data: premiumFeatures, error: pfError } = await supabase
        .rpc('get_user_premium_features', { 
          p_user_id: profiles[1].id // Mike (premium user)
        });

      if (!pfError) {
        console.log(`✅ Premium features test: ${JSON.stringify(premiumFeatures)}`);
      }

      // Test search usage increment
      const { error: searchError } = await supabase
        .rpc('increment_search_usage', {
          p_user_id: profiles[0].id // Sarah (free user)
        });

      if (!searchError) {
        console.log(`✅ Search usage increment test passed`);
      }

      // Test messaging permissions
      const { data: canMessage, error: msgTestError } = await supabase
        .rpc('can_user_message', {
          sender_id: profiles[0].id,
          recipient_id: profiles[1].id
        });

      if (!msgTestError) {
        console.log(`✅ Messaging permission test: ${canMessage}`);
      }
    }

    console.log('\n🎉 Sample data creation completed!');
    console.log('\n📋 Test Scenarios Ready:');
    console.log('• Sarah Johnson (Free) - 3 search limit, can message friends');
    console.log('• Mike Chen (Premium) - Unlimited features, multi-school');
    console.log('• Emma Davis (Free) - Drama student with school history');
    console.log('• Alex Rodriguez (Enterprise) - Administrator access');
    console.log('\n🌐 Visit http://localhost:8080 to test the features!');

  } catch (error) {
    console.error('❌ Sample data creation failed:', error);
  }
}

// Run the script
createSampleData();

export { createSampleData };