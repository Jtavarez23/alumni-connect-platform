#!/usr/bin/env node

/**
 * Apply Seed Data - Load comprehensive test data into the database
 */

import { Client } from 'pg'
import fs from 'fs'

const client = new Client({
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres'
})

async function applySeedData() {
  console.log('🌱 Applying Comprehensive Seed Data...\n')
  
  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL database')
    
    // Read the seed data
    const seedPath = './supabase/seed.sql'
    const seedData = fs.readFileSync(seedPath, 'utf8')
    
    console.log(`📄 Executing seed data from ${seedPath}...\n`)
    
    // Execute the seed data
    await client.query('BEGIN')
    
    try {
      const result = await client.query(seedData)
      await client.query('COMMIT')
      
      console.log('✅ Seed data applied successfully!')
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.log(`❌ Seed data application failed: ${error.message}`)
      throw error
    }
    
    // Test the result
    console.log('\n🧪 Testing Data Population...')
    await testDataPopulation()
    
  } catch (error) {
    console.error('💥 Seed operation failed:', error.message)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

async function testDataPopulation() {
  const tables = [
    'schools', 'profiles', 'user_education', 'search_quotas', 'class_years', 'yearbooks',
    'posts', 'comments', 'reactions', 'friendships', 
    'messaging_permissions', 'notifications', 'analytics_events'
  ]
  
  let totalRecords = 0
  
  for (const table of tables) {
    try {
      const result = await client.query(`SELECT COUNT(*) FROM public.${table}`)
      const count = parseInt(result.rows[0].count)
      console.log(`✅ ${table}: ${count} records`)
      totalRecords += count
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`)
    }
  }
  
  console.log(`\n📊 TOTAL RECORDS: ${totalRecords}`)
  
  if (totalRecords > 100) {
    console.log('🎉 SUCCESS: Database is populated with comprehensive test data!')
    console.log('✅ Ready for local development and testing')
    return true
  } else if (totalRecords > 50) {
    console.log('⚠️ PARTIAL: Some data populated, investigate missing records')
    return false
  } else {
    console.log('❌ FAILED: Seed data was not applied successfully')
    return false
  }
}

// Execute
applySeedData()