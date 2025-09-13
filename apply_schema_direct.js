#!/usr/bin/env node

/**
 * Direct PostgreSQL Schema Application - Google SWE Approach
 * Apply schema directly using node-postgres for maximum compatibility
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

async function applySchemaDirectly() {
  console.log('🔧 Applying Database Schema Directly via PostgreSQL...\n')
  
  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL database')
    
    // Read the consolidated schema
    const schemaPath = './supabase/migrations/20250911180000_consolidated_schema_rebuild.sql'
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    console.log(`📄 Executing consolidated schema from ${schemaPath}...\n`)
    
    // Execute the entire schema as one transaction
    await client.query('BEGIN')
    
    try {
      const result = await client.query(schema)
      await client.query('COMMIT')
      
      console.log('✅ Schema applied successfully!')
      console.log('🎉 Database rebuild completed!')
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.log(`❌ Schema application failed: ${error.message}`)
      throw error
    }
    
    // Test the result
    console.log('\n🧪 Testing Schema Application...')
    await testSchemaApplication()
    
  } catch (error) {
    console.error('💥 Database operation failed:', error.message)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

async function testSchemaApplication() {
  const expectedTables = [
    'schools', 'profiles', 'class_years', 'yearbooks', 'yearbook_pages',
    'posts', 'comments', 'reactions', 'friendships', 'messaging_permissions',
    'notifications', 'analytics_events'
  ]
  
  let tablesFound = 0
  
  for (const table of expectedTables) {
    try {
      const result = await client.query(`SELECT COUNT(*) FROM public.${table}`)
      console.log(`✅ ${table}: Available (${result.rows[0].count} rows)`)
      tablesFound++
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`)
    }
  }
  
  const healthScore = Math.round((tablesFound / expectedTables.length) * 100)
  console.log(`\n🏥 NEW DATABASE HEALTH SCORE: ${healthScore}% (${tablesFound}/${expectedTables.length} tables)`)
  
  if (healthScore >= 90) {
    console.log('🎉 SUCCESS: Database rebuild completed!')
    console.log('✅ Ready to apply sample data and continue development')
    return true
  } else if (healthScore >= 70) {
    console.log('⚠️ PARTIAL: Most tables created, investigate missing ones')
    return false
  } else {
    console.log('❌ FAILED: Schema rebuild was not successful')
    return false
  }
}

// Execute
applySchemaDirectly()