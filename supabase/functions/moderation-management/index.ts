// Alumni Connect - Moderation Management API
// Handles moderator actions on reports

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

    // Verify user is authenticated and is a moderator
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if user is a moderator
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_moderator')
      .eq('id', user.id)
      .single()

    if (!profile?.is_moderator) {
      return new Response(
        JSON.stringify({ error: 'Moderator access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const reportId = pathParts[pathParts.length - 1]

    if (req.method === 'GET') {
      // Get reports with optional filters
      const status = url.searchParams.get('status')
      const priority = url.searchParams.get('priority')
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '20')

      let query = supabaseClient
        .from('moderation_reports')
        .select(`
          *,
          reporter:reporter_id (id, first_name, last_name, email),
          assigned_to_user:assigned_to (id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })

      if (status) query = query.eq('status', status)
      if (priority) query = query.eq('priority', priority)

      const { data: reports, error: reportsError } = await query
        .range((page - 1) * limit, page * limit - 1)

      if (reportsError) {
        throw new Error(`Failed to fetch reports: ${reportsError.message}`)
      }

      return new Response(
        JSON.stringify({ reports }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (req.method === 'POST' && reportId === 'batch') {
      // Batch update reports
      const { report_ids, status, assigned_to } = await req.json()

      if (!report_ids || !Array.isArray(report_ids)) {
        return new Response(
          JSON.stringify({ error: 'report_ids array required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { error: updateError } = await supabaseClient
        .from('moderation_reports')
        .update({
          status: status || undefined,
          assigned_to: assigned_to || undefined,
          updated_at: new Date().toISOString()
        })
        .in('id', report_ids)

      if (updateError) {
        throw new Error(`Failed to update reports: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, updated: report_ids.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (req.method === 'PUT' && reportId) {
      // Update specific report
      const updates = await req.json()

      const { data: report, error: updateError } = await supabaseClient
        .from('moderation_reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update report: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({ report }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (req.method === 'POST' && reportId) {
      // Take action on a report
      const { action, target_user_id, notes, duration_hours } = await req.json()

      if (!action) {
        return new Response(
          JSON.stringify({ error: 'Action required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Create moderation action
      const { data: moderationAction, error: actionError } = await supabaseClient
        .from('moderation_actions')
        .insert({
          report_id: reportId,
          moderator_id: user.id,
          action,
          target_user_id: target_user_id || null,
          notes: notes || null,
          duration_hours: duration_hours || null
        })
        .select()
        .single()

      if (actionError) {
        throw new Error(`Failed to create moderation action: ${actionError.message}`)
      }

      // Update report status based on action
      let newStatus = 'resolved'
      if (action === 'dismiss') newStatus = 'dismissed'
      if (action === 'warn_user') newStatus = 'reviewing'

      await supabaseClient
        .from('moderation_reports')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', reportId)

      return new Response(
        JSON.stringify({ action: moderationAction }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )

  } catch (error) {
    console.error('Moderation management API error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})