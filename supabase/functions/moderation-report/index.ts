// Alumni Connect - Moderation Report API
// Handles user reports for content moderation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { target_table, target_id, reason, details, screenshots } = await req.json()

    // Validate required fields
    if (!target_table || !target_id || !reason) {
      return new Response(
        JSON.stringify({ error: 'target_table, target_id, and reason are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate target table is allowed
    const allowedTables = ['posts', 'profiles', 'yearbook_pages', 'events', 'businesses', 'jobs', 'messages']
    if (!allowedTables.includes(target_table)) {
      return new Response(
        JSON.stringify({ error: 'Invalid target_table' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate reason is valid
    const validReasons = ['impersonation', 'nudity', 'violence', 'harassment', 'copyright', 'spam', 'other']
    if (!validReasons.includes(reason)) {
      return new Response(
        JSON.stringify({ error: 'Invalid reason' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create moderation report
    const { data: report, error: reportError } = await supabaseClient
      .from('moderation_reports')
      .insert({
        reporter_id: user.id,
        target_table,
        target_id,
        reason,
        details: details || null,
        screenshots: screenshots || [],
        status: 'open',
        priority: reason === 'violence' || reason === 'nudity' ? 'high' : 'medium'
      })
      .select()
      .single()

    if (reportError) {
      console.error('Moderation report error:', reportError)
      return new Response(
        JSON.stringify({ error: 'Failed to create report' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // If high priority, notify moderators immediately
    if (report.priority === 'high') {
      await notifyModerators(report)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        report_id: report.id,
        message: 'Report submitted successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    )

  } catch (error) {
    console.error('Moderation report API error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Notify moderators about urgent reports
async function notifyModerators(report: any) {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get moderators
    const { data: moderators } = await supabaseClient
      .from('profiles')
      .select('id, email')
      .eq('is_moderator', true)

    if (moderators && moderators.length > 0) {
      // In production, this would send emails or push notifications
      console.log(`Urgent report ${report.id} - Notifying ${moderators.length} moderators`)
      
      // For now, just log the notification
      moderators.forEach(moderator => {
        console.log(`Notifying moderator ${moderator.email} about report ${report.id}`)
      })
    }
  } catch (error) {
    console.error('Failed to notify moderators:', error)
  }
}