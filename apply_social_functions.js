#!/usr/bin/env node

/**
 * Apply Social Feed RPC Functions
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

async function applySocialFunctions() {
  console.log('🔧 Applying Social Feed RPC Functions...\n')
  
  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL database')
    
    // Read the RPC functions
    const functionsSQL = fs.readFileSync('./social_feed_rpc_functions.sql', 'utf8')
    
    console.log('📄 Executing social feed RPC functions...\n')
    
    // Execute the functions
    await client.query('BEGIN')
    
    try {
      const result = await client.query(functionsSQL)
      await client.query('COMMIT')
      
      console.log('✅ RPC functions applied successfully!')
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.log(`❌ RPC function application failed: ${error.message}`)
      throw error
    }
    
    // Test the functions
    console.log('\n🧪 Testing RPC Functions...')
    await testRPCFunctions()
    
  } catch (error) {
    console.error('💥 Social functions operation failed:', error.message)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

async function testRPCFunctions() {
  const functions = [
    'get_post_metrics',
    'create_post', 
    'toggle_post_like',
    'get_network_feed',
    'get_for_you_feed'
  ]
  
  for (const func of functions) {
    try {
      const result = await client.query(`
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = $1
      `, [func])
      
      if (result.rows.length > 0) {
        console.log(`✅ ${func}: Function exists`)
      } else {
        console.log(`❌ ${func}: Function missing`)
      }
    } catch (err) {
      console.log(`❌ ${func}: Error checking function - ${err.message}`)
    }
  }
}

// Execute
applySocialFunctions()