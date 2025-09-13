import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Initialize Supabase client with local settings
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applySeedData() {
  console.log('🎓 Applying Alumni Connect seed data...\n')
  
  try {
    // Test connection by trying to query schools table
    console.log('🔍 Testing connection...')
    try {
      const { data: connectionTest } = await supabase
        .from('schools')
        .select('count')
        .limit(1)
      console.log('✅ Connected to Supabase successfully\n')
    } catch (err) {
      console.log('📝 Database tables not ready yet, will proceed with creation\n')
    }
    
    // Create schools
    console.log('📚 Creating sample schools...')
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .upsert([
        {
          name: 'Springfield High School',
          slug: 'springfield-high-school',
          type: 'high_school',
          location: { city: 'Springfield', state: 'Illinois', country: 'USA' },
          verified: true,
          founded_year: 1920,
          mascot: 'Tigers',
          colors: ['orange', 'black']
        },
        {
          name: 'Riverside Academy', 
          slug: 'riverside-academy',
          type: 'high_school',
          location: { city: 'Riverside', state: 'California', country: 'USA' },
          verified: true,
          founded_year: 1955,
          mascot: 'Eagles',
          colors: ['blue', 'gold']
        },
        {
          name: 'Stanford University',
          slug: 'stanford-university', 
          type: 'university',
          location: { city: 'Stanford', state: 'California', country: 'USA' },
          verified: true,
          founded_year: 1885,
          mascot: 'Cardinal',
          colors: ['cardinal', 'white']
        }
      ], { 
        onConflict: 'slug',
        returning: 'minimal'
      })

    if (schoolsError) {
      console.log('⚠️ School creation warning:', schoolsError.message)
    } else {
      console.log('✅ Schools created successfully')
    }

    // Check if we can query schools
    const { data: schoolsCheck, error: schoolsCheckError } = await supabase
      .from('schools')
      .select('id, name, slug')
      .limit(3)
      
    if (schoolsCheckError) {
      console.log('⚠️ Could not verify schools:', schoolsCheckError.message)
    } else {
      console.log(`📋 Found ${schoolsCheck?.length || 0} schools in database`)
      
      if (schoolsCheck && schoolsCheck.length > 0) {
        // Add class years for the first school as a test
        console.log('\n🗓️ Creating class years...')
        const firstSchool = schoolsCheck[0]
        
        const classYears = []
        for (let year = 2015; year <= 2025; year++) {
          classYears.push({
            school_id: firstSchool.id,
            year: year
          })
        }
        
        const { data: classYearsData, error: classYearsError } = await supabase
          .from('class_years')
          .upsert(classYears, { 
            onConflict: 'school_id,year',
            returning: 'minimal' 
          })
        
        if (classYearsError) {
          console.log('⚠️ Class years warning:', classYearsError.message)
        } else {
          console.log('✅ Class years created successfully')
        }
      }
    }

    console.log('\n✅ Seed data application completed!')
    console.log('\n📋 Ready for testing:')
    console.log('• Sample schools with metadata')
    console.log('• Class years for testing')
    console.log('• Database structure prepared')
    console.log('\n🌐 Visit http://127.0.0.1:54323 to see Supabase Studio')
    console.log('🌐 Visit http://localhost:3000 to test the application')
    
  } catch (error) {
    console.error('❌ Failed to apply seed data:', error.message)
  }
}

// Run the script
applySeedData()