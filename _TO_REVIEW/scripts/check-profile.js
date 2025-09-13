import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dyhloaxsdcfgfyfhrdfc.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxMzA1MiwiZXhwIjoyMDcxODg5MDUyfQ.qUiJxVaSczLmasYXC7OXgtTRExVjj8dFxgbM1ROGvyk'
);

async function checkProfile() {
  console.log('🔍 CHECKING PROFILE COMPLETENESS...');
  console.log('='.repeat(50));
  
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'jtav1219@gmail.com')
      .single();
    
    if (profileError) {
      console.log('❌ Profile Error:', profileError.message);
      return;
    }
    
    console.log('👤 PROFILE DATA:');
    console.log('Name:', profile.first_name, profile.last_name);
    console.log('Email:', profile.email);
    console.log('Bio:', profile.bio || 'Not set');
    console.log('School ID:', profile.school_id || 'Not set');
    console.log('Graduation Year:', profile.graduation_year || 'Not set');
    console.log('Subscription Tier:', profile.subscription_tier || 'Not set');
    
    // Check user_education table (V2)
    console.log('\n🎓 SCHOOL HISTORY (V2):');
    const { data: education, error: eduError } = await supabase
      .from('user_education')
      .select('*, schools(name, location)')
      .eq('user_id', profile.id);
    
    if (eduError) {
      console.log('❌ Education Error:', eduError.message);
    } else if (education && education.length > 0) {
      console.log(`✅ Found ${education.length} school records:`);
      education.forEach((edu, i) => {
        console.log(`${i+1}. ${edu.schools?.name} (${edu.start_year}-${edu.end_year})`);
      });
    } else {
      console.log('❌ No school history found - THIS IS WHY ONBOARDING POPUP SHOWS!');
      console.log('\n💡 SOLUTION: Add school data to user_education table');
      
      // Let's add school data if the old profile has it
      if (profile.school_id && profile.graduation_year) {
        console.log('\n🔧 FIXING: Adding school data from old profile...');
        
        const { error: insertError } = await supabase
          .from('user_education')
          .insert([{
            user_id: profile.id,
            school_id: profile.school_id,
            start_year: profile.graduation_year - 4, // Assume 4-year program
            end_year: profile.graduation_year,
            is_primary: true,
            is_graduated: true,
            role_type: 'student'
          }]);
        
        if (insertError) {
          console.log('❌ Insert Error:', insertError.message);
        } else {
          console.log('✅ FIXED! School data added to user_education table');
          console.log('🔄 Refresh your browser - onboarding popup should be gone!');
        }
      }
    }
    
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

checkProfile();