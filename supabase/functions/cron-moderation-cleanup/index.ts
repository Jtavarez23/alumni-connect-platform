// Alumni Connect - Moderation Cleanup Cron Job
// Handles automated moderation tasks and notifications

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

    console.log('Starting moderation cleanup cron job')

    // 1. Close stale reports (open for more than 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: staleReports, error: staleError } = await supabaseClient
      .from('moderation_reports')
      .select('id')
      .eq('status', 'open')
      .lt('created_at', thirtyDaysAgo.toISOString())
      .limit(100)

    if (staleError) {
      console.error('Error fetching stale reports:', staleError)
    } else if (staleReports && staleReports.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('moderation_reports')
        .update({ 
          status: 'dismissed',
          updated_at: new Date().toISOString() 
        })
        .in('id', staleReports.map(r => r.id))

      if (updateError) {
        console.error('Error closing stale reports:', updateError)
      } else {
        console.log(`Closed ${staleReports.length} stale reports`)
      }
    }

    // 2. Notify about high-priority reports that are still open
    const { data: highPriorityReports, error: highPriorityError } = await supabaseClient
      .from('moderation_reports')
      .select('id, created_at, priority')
      .eq('status', 'open')
      .eq('priority', 'high')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Older than 24 hours
      .limit(50)

    if (highPriorityError) {
      console.error('Error fetching high priority reports:', highPriorityError)
    } else if (highPriorityReports && highPriorityReports.length > 0) {
      console.log(`Found ${highPriorityReports.length} high priority reports needing attention`)
      
      // In production, this would send actual notifications to moderators
      highPriorityReports.forEach(report => {
        console.log(`High priority report ${report.id} needs attention (created: ${report.created_at})`)
      })
    }

    // 3. Reassign unassigned high-priority reports
    const { data: unassignedHighPriority, error: unassignedError } = await supabaseClient
      .from('moderation_reports')
      .select('id')
      .eq('status', 'open')
      .eq('priority', 'high')
      .is('assigned_to', null)
      .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Older than 2 hours
      .limit(20)

    if (unassignedError) {
      console.error('Error fetching unassigned high priority reports:', unassignedError)
    } else if (unassignedHighPriority && unassignedHighPriority.length > 0) {
      // Get available moderators
      const { data: moderators } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('is_moderator', true)
        .order('last_active', { ascending: false })
        .limit(5)

      if (moderators && moderators.length > 0) {
        // Simple round-robin assignment
        const moderatorIndex = Math.floor(Math.random() * moderators.length)
        const assignedModerator = moderators[moderatorIndex]

        const { error: assignError } = await supabaseClient
          .from('moderation_reports')
          .update({ 
            assigned_to: assignedModerator.id,
            updated_at: new Date().toISOString() 
          })
          .in('id', unassignedHighPriority.map(r => r.id))

        if (assignError) {
          console.error('Error assigning reports:', assignError)
        } else {
          console.log(`Assigned ${unassignedHighPriority.length} reports to moderator ${assignedModerator.id}`)
        }
      }
    }

    console.log('Moderation cleanup cron job completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats: {
          stale_closed: staleReports?.length || 0,
          high_priority_needing_attention: highPriorityReports?.length || 0,
          reports_assigned: unassignedHighPriority?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Moderation cleanup cron job error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})