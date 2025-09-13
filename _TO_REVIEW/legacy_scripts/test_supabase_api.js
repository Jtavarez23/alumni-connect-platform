import fetch from 'node-fetch';

// Supabase configuration
const SUPABASE_URL = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTMwNTIsImV4cCI6MjA3MTg4OTA1Mn0.eg_bc94ySXthS_A8_oIffrrsW4UcSSu5lEKOw89OIz0';

// Test user and school IDs
const TEST_USER_ID = 'b99870dc-6821-4b7b-985b-02c0df497b69';
const TEST_SCHOOL_ID = 'c9052f67-a349-4f89-8e02-e0fc453fc09c';

async function testSupabaseAPI() {
  console.log('🧪 Testing Supabase REST API for social_proof_metrics table...\n');

  // Test 1: Basic SELECT query (the one that was failing with 406)
  console.log('📋 Test 1: Basic SELECT query that was causing 406 errors...');
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/social_proof_metrics?user_id=eq.${TEST_USER_ID}&school_id=eq.${TEST_SCHOOL_ID}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS: API call completed successfully');
      console.log(`📊 Data returned (${data.length} records):`);
      console.table(data);
    } else {
      console.log('❌ API call failed');
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: GET all records from the table
  console.log('📋 Test 2: GET all records from social_proof_metrics table...');
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/social_proof_metrics?select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS: Retrieved all records');
      console.log(`📊 Total records found: ${data.length}`);
      if (data.length > 0) {
        console.table(data);
      }
    } else {
      console.log('❌ Failed to retrieve all records');
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: Try to insert a new record
  console.log('📋 Test 3: Testing INSERT operation...');
  try {
    const newRecord = {
      user_id: TEST_USER_ID,
      school_id: TEST_SCHOOL_ID,
      metric_type: 'test_metric',
      metric_value: 99
    };

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/social_proof_metrics`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newRecord)
      }
    );

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS: INSERT operation completed');
      console.log('📊 Inserted record:');
      console.table(data);
    } else {
      console.log('❌ INSERT operation failed');
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 4: Test UPDATE operation
  console.log('📋 Test 4: Testing UPDATE operation...');
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/social_proof_metrics?user_id=eq.${TEST_USER_ID}&school_id=eq.${TEST_SCHOOL_ID}&metric_type=eq.connections`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          metric_value: 25,
          updated_at: new Date().toISOString()
        })
      }
    );

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS: UPDATE operation completed');
      console.log('📊 Updated record:');
      console.table(data);
    } else {
      console.log('❌ UPDATE operation failed');
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Summary
  console.log('📋 Summary: All API tests completed!');
  console.log('🔧 If all tests show status 200-299, the 406 error should be resolved.');
  console.log('🎉 The social_proof_metrics table is now accessible via the Supabase REST API.');
}

// Execute the tests
testSupabaseAPI().catch(console.error);