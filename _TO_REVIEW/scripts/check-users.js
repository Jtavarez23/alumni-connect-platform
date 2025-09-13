import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dyhloaxsdcfgfyfhrdfc.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMxMzA1MiwiZXhwIjoyMDcxODg5MDUyfQ.qUiJxVaSczLmasYXC7OXgtTRExVjj8dFxgbM1ROGvyk'
);

async function checkUsers() {
  console.log('🔍 CHECKING EXISTING USERS...');
  console.log('='.repeat(40));
  
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, created_at')
      .limit(10);
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log(`📊 Found ${profiles?.length || 0} user profiles:`);
      
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, i) => {
          console.log(`${i+1}. ${profile.first_name} ${profile.last_name} (${profile.email})`);
        });
        
        console.log('\n✅ You can login with any of these email addresses');
        console.log('🔑 If you forgot the password, use: http://localhost:8080/forgot-password');
        
      } else {
        console.log('\n🆕 No users found! You need to create an account first.');
        console.log('👉 Visit: http://localhost:8080/signup');
        console.log('📧 Or I can create a test user for you');
      }
    }
    
    // Also check auth users
    console.log('\n🔐 Checking Supabase Auth users...');
    
    // This requires admin access, so it might not work with regular service role
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('⚠️ Cannot access auth users (need admin key)');
      console.log('💡 Try signing up at: http://localhost:8080/signup');
    } else {
      console.log(`👥 Found ${authUsers.users?.length || 0} auth users`);
      authUsers.users?.forEach((user, i) => {
        console.log(`${i+1}. ${user.email} (${user.created_at})`);
      });
    }
    
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

checkUsers();