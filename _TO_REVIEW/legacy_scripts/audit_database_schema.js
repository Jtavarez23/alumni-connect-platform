#!/usr/bin/env node

/**
 * Database Schema Audit Tool - Google SWE Architecture Approach
 * 
 * This tool performs a comprehensive analysis of:
 * 1. Current table structure and relationships
 * 2. Migration dependency analysis
 * 3. RLS policy consistency
 * 4. Index optimization opportunities
 * 5. Data integrity constraints
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Initialize Supabase client for local development
const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

class DatabaseAuditor {
  constructor() {
    this.auditResults = {
      tables: {},
      relationships: [],
      policies: [],
      indexes: [],
      issues: [],
      recommendations: []
    }
  }

  async runFullAudit() {
    console.log('🔍 Starting Comprehensive Database Schema Audit...\n')
    
    try {
      await this.analyzeCurrentTables()
      await this.analyzeRelationships()
      await this.analyzeRLSPolicies()
      await this.analyzeIndexes()
      await this.analyzeMigrationDependencies()
      await this.generateReport()
      
    } catch (error) {
      console.error('❌ Audit failed:', error.message)
    }
  }

  async analyzeCurrentTables() {
    console.log('📊 Analyzing current table structure...')
    
    const { data: tables, error } = await supabase
      .rpc('get_table_info')
      .select()
    
    if (error && error.message.includes('function get_table_info() does not exist')) {
      // Fallback: Query information_schema directly
      const { data: tablesInfo, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
      
      if (tablesError) {
        console.log('⚠️ Could not query information_schema, using alternative approach...')
        // Try to list tables we know should exist
        await this.checkExpectedTables()
        return
      }
      
      console.log(`✅ Found ${tablesInfo?.length || 0} tables in public schema`)
      tablesInfo?.forEach(table => {
        console.log(`  - ${table.table_name} (${table.table_type})`)
      })
      
    } else if (error) {
      console.log('⚠️ Table analysis error:', error.message)
    } else {
      console.log(`✅ Analyzed ${tables?.length || 0} tables`)
    }
  }

  async checkExpectedTables() {
    console.log('🎯 Checking expected core tables...')
    
    const expectedTables = [
      'schools', 'profiles', 'class_years', 'yearbooks', 
      'posts', 'comments', 'reactions', 'friendships',
      'messaging_permissions', 'notifications', 'events'
    ]
    
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1)
        
        if (error) {
          if (error.message.includes('does not exist')) {
            console.log(`❌ Missing table: ${tableName}`)
            this.auditResults.issues.push({
              type: 'MISSING_TABLE',
              table: tableName,
              severity: 'HIGH',
              description: `Core table ${tableName} does not exist`
            })
          } else {
            console.log(`⚠️ Access issue with ${tableName}: ${error.message}`)
            this.auditResults.issues.push({
              type: 'ACCESS_ISSUE',
              table: tableName,
              severity: 'MEDIUM',
              description: error.message
            })
          }
        } else {
          console.log(`✅ Table exists: ${tableName}`)
          this.auditResults.tables[tableName] = { exists: true, accessible: true }
        }
      } catch (err) {
        console.log(`❌ Error checking ${tableName}:`, err.message)
      }
    }
  }

  async analyzeRelationships() {
    console.log('\n🔗 Analyzing table relationships...')
    
    try {
      // Check foreign key constraints
      const { data: constraints, error } = await supabase
        .from('information_schema.table_constraints')
        .select('*')
        .eq('constraint_type', 'FOREIGN KEY')
        .eq('table_schema', 'public')
      
      if (error) {
        console.log('⚠️ Could not analyze relationships:', error.message)
        return
      }
      
      console.log(`✅ Found ${constraints?.length || 0} foreign key relationships`)
      this.auditResults.relationships = constraints || []
      
    } catch (err) {
      console.log('⚠️ Relationship analysis failed:', err.message)
    }
  }

  async analyzeRLSPolicies() {
    console.log('\n🔐 Analyzing Row Level Security policies...')
    
    try {
      const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('*')
      
      if (error) {
        console.log('⚠️ Could not analyze RLS policies:', error.message)
        return
      }
      
      console.log(`✅ Found ${policies?.length || 0} RLS policies`)
      this.auditResults.policies = policies || []
      
      // Check for tables without RLS enabled
      const tablesWithoutRLS = Object.keys(this.auditResults.tables).filter(table => {
        const tablePolicies = policies?.filter(p => p.tablename === table) || []
        return tablePolicies.length === 0
      })
      
      if (tablesWithoutRLS.length > 0) {
        this.auditResults.issues.push({
          type: 'MISSING_RLS',
          tables: tablesWithoutRLS,
          severity: 'HIGH',
          description: 'Tables without RLS policies detected'
        })
      }
      
    } catch (err) {
      console.log('⚠️ RLS analysis failed:', err.message)
    }
  }

  async analyzeIndexes() {
    console.log('\n📈 Analyzing database indexes...')
    
    try {
      const { data: indexes, error } = await supabase
        .from('pg_indexes')
        .select('*')
        .eq('schemaname', 'public')
      
      if (error) {
        console.log('⚠️ Could not analyze indexes:', error.message)
        return
      }
      
      console.log(`✅ Found ${indexes?.length || 0} indexes`)
      this.auditResults.indexes = indexes || []
      
    } catch (err) {
      console.log('⚠️ Index analysis failed:', err.message)
    }
  }

  async analyzeMigrationDependencies() {
    console.log('\n🔄 Analyzing migration file dependencies...')
    
    try {
      const migrationsDir = './supabase/migrations'
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
      
      console.log(`📂 Found ${files.length} migration files`)
      
      const dependencies = []
      const createdTables = new Set()
      const referencedTables = new Set()
      
      for (const file of files) {
        const filePath = path.join(migrationsDir, file)
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Extract CREATE TABLE statements
        const createMatches = content.match(/CREATE TABLE.*?(\w+)/gi) || []
        createMatches.forEach(match => {
          const tableName = match.split(' ').pop()?.toLowerCase()
          if (tableName) {
            createdTables.add(tableName)
            dependencies.push({
              file,
              action: 'CREATE',
              table: tableName
            })
          }
        })
        
        // Extract REFERENCES 
        const refMatches = content.match(/REFERENCES\s+(\w+)/gi) || []
        refMatches.forEach(match => {
          const tableName = match.split(' ')[1]?.toLowerCase()
          if (tableName) {
            referencedTables.add(tableName)
            dependencies.push({
              file,
              action: 'REFERENCE',
              table: tableName
            })
          }
        })
      }
      
      // Check for dependency issues
      const dependencyIssues = []
      dependencies.forEach(dep => {
        if (dep.action === 'REFERENCE' && !createdTables.has(dep.table)) {
          dependencyIssues.push({
            file: dep.file,
            issue: `References table '${dep.table}' that may not exist yet`,
            severity: 'HIGH'
          })
        }
      })
      
      if (dependencyIssues.length > 0) {
        console.log(`❌ Found ${dependencyIssues.length} dependency issues`)
        this.auditResults.issues.push(...dependencyIssues.map(issue => ({
          type: 'MIGRATION_DEPENDENCY',
          ...issue,
          description: issue.issue
        })))
      } else {
        console.log('✅ No migration dependency issues found')
      }
      
    } catch (err) {
      console.log('⚠️ Migration analysis failed:', err.message)
    }
  }

  async generateReport() {
    console.log('\n📋 Generating Database Audit Report...')
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTables: Object.keys(this.auditResults.tables).length,
        totalIssues: this.auditResults.issues.length,
        highSeverityIssues: this.auditResults.issues.filter(i => i.severity === 'HIGH').length,
        totalPolicies: this.auditResults.policies.length,
        totalIndexes: this.auditResults.indexes.length
      },
      details: this.auditResults
    }
    
    // Save report to file
    fs.writeFileSync('./DATABASE_AUDIT_REPORT.json', JSON.stringify(report, null, 2))
    
    console.log('\n🎯 AUDIT SUMMARY:')
    console.log(`Tables: ${report.summary.totalTables}`)
    console.log(`Issues: ${report.summary.totalIssues} (${report.summary.highSeverityIssues} high severity)`)
    console.log(`RLS Policies: ${report.summary.totalPolicies}`)
    console.log(`Indexes: ${report.summary.totalIndexes}`)
    
    if (this.auditResults.issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES FOUND:')
      this.auditResults.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.type}: ${issue.description}`)
      })
    }
    
    console.log('\n📄 Full report saved to: DATABASE_AUDIT_REPORT.json')
  }
}

// Run the audit
const auditor = new DatabaseAuditor()
auditor.runFullAudit()