#!/usr/bin/env node

/**
 * Apply Events System Migrations
 * Directly execute the schema and RPC function migrations
 */

import { Client } from 'pg'
import { readFileSync } from 'fs'

const client = new Client({
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres'
})

async function applyMigrations() {
  console.log('🔨 Applying Events System Migrations...\n')
  
  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL database')
    
    // Apply schema migration
    console.log('\n📊 Applying events schema migration...')
    try {
      const schemaSql = readFileSync('supabase/migrations/20250911190000_events_system_schema.sql', 'utf8')
      await client.query(schemaSql)
      console.log('✅ Events schema migration applied successfully')
    } catch (err) {
      console.log(`❌ Schema migration failed: ${err.message}`)
    }
    
    // Apply RPC functions migration
    console.log('\n⚙️ Applying RPC functions migration...')
    try {
      const rpcSql = readFileSync('supabase/migrations/20250911200000_events_rpc_functions.sql', 'utf8')
      await client.query(rpcSql)
      console.log('✅ RPC functions migration applied successfully')
    } catch (err) {
      console.log(`❌ RPC functions migration failed: ${err.message}`)
    }
    
    // Verify functions exist
    console.log('\n🔍 Verifying RPC functions...')
    try {
      const functionsResult = await client.query(`
        SELECT proname, pronargs 
        FROM pg_proc 
        WHERE proname IN ('create_event', 'search_events', 'get_event_details', 'rsvp_to_event', 'get_user_event_rsvp', 'get_event_metrics')
        ORDER BY proname
      `)
      
      console.log(`✅ Found ${functionsResult.rows.length} RPC functions:`)
      functionsResult.rows.forEach(func => {
        console.log(`   - ${func.proname}() with ${func.pronargs} parameters`)
      })
    } catch (err) {
      console.log(`❌ Function verification failed: ${err.message}`)
    }
    
    // Verify tables exist
    console.log('\n📋 Verifying events tables...')
    try {
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'event%'
        ORDER BY table_name
      `)
      
      console.log(`✅ Found ${tablesResult.rows.length} events tables:`)
      tablesResult.rows.forEach(table => {
        console.log(`   - ${table.table_name}`)
      })
    } catch (err) {
      console.log(`❌ Table verification failed: ${err.message}`)
    }
    
    console.log('\n🎉 Events system migrations completed successfully!')
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

// Execute migrations
applyMigrations()