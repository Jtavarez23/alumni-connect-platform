#!/usr/bin/env node

/**
 * Direct Database Inspection Tool
 * Google SWE approach: When system tables fail, test core functionality directly
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspectDatabase() {
  console.log('🔍 Direct Database Inspection - Google SWE Approach\n')
  
  const coreExpectedTables = [
    'schools', 'profiles', 'class_years', 'yearbooks',
    'posts', 'comments', 'reactions', 'friendships', 
    'messaging_permissions', 'notifications', 'analytics_events'
  ]
  
  const results = {
    existingTables: [],
    missingTables: [],
    accessErrors: [],
    dataStatus: {}
  }
  
  console.log('📊 Testing Core Table Accessibility...\n')
  
  for (const table of coreExpectedTables) {
    try {
      console.log(`Testing ${table}...`)
      
      // Test basic read access and count
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1)
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${table}: TABLE MISSING`)
          results.missingTables.push(table)
        } else {
          console.log(`⚠️ ${table}: ACCESS ERROR - ${error.message}`)
          results.accessErrors.push({ table, error: error.message })
        }
      } else {
        console.log(`✅ ${table}: EXISTS (${count || 0} rows)`)
        results.existingTables.push(table)
        results.dataStatus[table] = {
          exists: true,
          rowCount: count || 0,
          hasData: (count || 0) > 0
        }
      }
      
    } catch (err) {
      console.log(`💥 ${table}: CRITICAL ERROR - ${err.message}`)
      results.accessErrors.push({ table, error: err.message })
    }
  }
  
  console.log('\n📈 Testing Sample Data from Existing Tables...\n')
  
  // Test sample data from working tables
  for (const table of results.existingTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(3)
      
      if (error) {
        console.log(`⚠️ ${table}: Can't read sample data - ${error.message}`)
      } else {
        console.log(`✅ ${table}: ${data?.length || 0} sample records available`)
        if (data && data.length > 0) {
          console.log(`   Sample columns: ${Object.keys(data[0]).join(', ')}`)
        }
      }
    } catch (err) {
      console.log(`💥 ${table}: Sample data error - ${err.message}`)
    }
  }
  
  console.log('\n🎯 SUMMARY:\n')
  console.log(`✅ Working Tables: ${results.existingTables.length}`)
  console.log(`❌ Missing Tables: ${results.missingTables.length}`)  
  console.log(`⚠️ Access Errors: ${results.accessErrors.length}`)
  
  if (results.missingTables.length > 0) {
    console.log('\n🚨 CRITICAL: Missing Core Tables:')
    results.missingTables.forEach(table => {
      console.log(`  - ${table}`)
    })
  }
  
  if (results.accessErrors.length > 0) {
    console.log('\n⚠️ ACCESS ISSUES:')
    results.accessErrors.forEach(issue => {
      console.log(`  - ${issue.table}: ${issue.error}`)
    })
  }
  
  const tablesWithData = Object.values(results.dataStatus).filter(t => t.hasData).length
  console.log(`\n📊 Tables with actual data: ${tablesWithData}/${results.existingTables.length}`)
  
  // Database Health Score (Google SWE metrics approach)
  const totalExpected = coreExpectedTables.length
  const healthScore = Math.round((results.existingTables.length / totalExpected) * 100)
  
  console.log(`\n🏥 DATABASE HEALTH SCORE: ${healthScore}% (${results.existingTables.length}/${totalExpected} core tables)`)
  
  if (healthScore < 80) {
    console.log('🚨 URGENT: Database is not production ready')
    console.log('🔧 NEXT: Consolidate and fix migration dependencies')
  } else if (healthScore < 95) {
    console.log('⚠️ WARNING: Some tables missing, investigate migrations')  
  } else {
    console.log('✅ GOOD: Core database structure is healthy')
  }
  
  return results
}

// Run inspection
inspectDatabase().catch(console.error)