import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeRLSStructure() {
  try {
    console.log('🔍 Analyzing RLS Structure...\n');
    
    // 1. Get all tables with RLS enabled
    console.log('1. Tables with RLS enabled:');
    const { data: rlsTables, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname, 
          tablename, 
          rowsecurity as rls_enabled,
          hasoids
        FROM pg_tables pt
        JOIN pg_class pc ON pc.relname = pt.tablename
        WHERE schemaname = 'public' 
          AND pc.relrowsecurity = true
        ORDER BY tablename;
      `
    });
    
    if (rlsError) {
      console.error('Error getting RLS tables:', rlsError.message);
    } else if (rlsTables) {
      rlsTables.forEach(table => {
        console.log(`  ✅ ${table.tablename}`);
      });
    }
    
    // 2. Get all policies for each table
    console.log('\n2. Current RLS Policies:');
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `
    });
    
    if (policiesError) {
      console.error('Error getting policies:', policiesError.message);
    } else if (policies) {
      let currentTable = '';
      policies.forEach(policy => {
        if (policy.tablename !== currentTable) {
          currentTable = policy.tablename;
          console.log(`\n  📋 ${policy.tablename}:`);
        }
        console.log(`    - ${policy.policyname} (${policy.cmd})`);
        if (policy.qual) {
          console.log(`      USING: ${policy.qual}`);
        }
        if (policy.with_check) {
          console.log(`      CHECK: ${policy.with_check}`);
        }
      });
    }
    
    // 3. Identify potential recursion patterns
    console.log('\n3. Analyzing for recursion patterns:');
    if (policies) {
      const recursionRisks = policies.filter(policy => {
        const qual = policy.qual || '';
        const withCheck = policy.with_check || '';
        const combined = qual + ' ' + withCheck;
        
        // Look for patterns that could cause recursion
        return (
          combined.includes('FROM public.profiles') && policy.tablename === 'profiles' ||
          combined.includes('FROM public.user_education') && policy.tablename === 'user_education' ||
          combined.includes('FROM public.connections') && policy.tablename === 'connections'
        );
      });
      
      if (recursionRisks.length > 0) {
        console.log('  ⚠️  Potential recursion risks found:');
        recursionRisks.forEach(risk => {
          console.log(`    - ${risk.tablename}.${risk.policyname}`);
        });
      } else {
        console.log('  ✅ No obvious recursion patterns detected');
      }
    }
    
    // 4. Check which tables are missing policies
    console.log('\n4. Tables missing RLS policies:');
    const { data: allTables, error: tablesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT tablename 
        FROM pg_tables pt
        JOIN pg_class pc ON pc.relname = pt.tablename
        WHERE schemaname = 'public' 
          AND pc.relrowsecurity = true
          AND pt.tablename NOT IN (
            SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
          )
        ORDER BY tablename;
      `
    });
    
    if (tablesError) {
      console.error('Error checking missing policies:', tablesError.message);
    } else if (allTables && allTables.length > 0) {
      allTables.forEach(table => {
        console.log(`  ❌ ${table.tablename} - has RLS enabled but no policies`);
      });
    } else {
      console.log('  ✅ All RLS-enabled tables have policies');
    }
    
    console.log('\n✅ RLS structure analysis completed');
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

analyzeRLSStructure();