import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dyhloaxsdcfgfyfhrdfc.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxMzA1MiwiZXhwIjoyMDcxODg5MDUyfQ.qUiJxVaSczLmasYXC7OXgtTRExVjj8dFxgbM1ROGvyk'
);

async function testV2Onboarding() {
  console.log('🧪 TESTING V2 ONBOARDING FIX');
  console.log('='.repeat(50));
  
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('email', 'jtav1219@gmail.com')
      .single();
    
    if (profileError) {
      console.log('❌ Profile Error:', profileError.message);
      return;
    }
    
    console.log(`👤 Testing for: ${profile.first_name} ${profile.last_name}`);
    
    // Test V2 school history (what frontend will query)
    const { data: education, error: eduError } = await supabase
      .from('user_education')
      .select(`
        id,
        start_year,
        end_year,
        is_primary,
        role_type,
        schools(id, name, type, location)
      `)
      .eq('user_id', profile.id);
    
    if (eduError) {
      console.log('❌ Education Error:', eduError.message);
      return;
    }
    
    console.log('\n🎓 V2 SCHOOL HISTORY:');
    if (education && education.length > 0) {
      education.forEach((edu, i) => {
        console.log(`${i+1}. ${edu.schools?.name} (${edu.start_year}-${edu.end_year})`);
        console.log(`   Primary: ${edu.is_primary}, Role: ${edu.role_type}`);
      });
      
      console.log(`\n📊 Total schools found: ${education.length}`);
      console.log('✅ EXPECTED RESULT: Onboarding popup should NOT appear');
      console.log('✅ Frontend useSchoolHistory hook will find schools');
      console.log('✅ Dashboard condition (schoolHistory.length === 0) will be FALSE');
      
    } else {
      console.log('❌ NO SCHOOLS FOUND');
      console.log('❌ PROBLEM: Onboarding popup WILL appear');
      console.log('⚠️ Frontend will see schoolHistory.length === 0');
    }
    
    // Test the exact same query the frontend will make
    console.log('\n🔍 TESTING FRONTEND QUERY (useSchoolHistory):');
    const { data: frontendData, error: frontendError } = await supabase
      .from('user_education')
      .select(`
        *,
        schools(id, name, type, location, verified)
      `)
      .eq('user_id', profile.id)
      .order('start_year', { ascending: false });
    
    if (frontendError) {
      console.log('❌ Frontend Query Error:', frontendError.message);
    } else {
      console.log(`📊 Frontend will see: ${frontendData?.length || 0} schools`);
      if (frontendData && frontendData.length > 0) {
        console.log('✅ SUCCESS: Dashboard onboarding popup will NOT show');
      } else {
        console.log('❌ FAILURE: Dashboard onboarding popup WILL show');
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testV2Onboarding();