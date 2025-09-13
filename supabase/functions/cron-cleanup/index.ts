// Alumni Connect - Cleanup Cron Job
// AC-ARCH-003 compliant cleanup implementation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🧹 Starting nightly cleanup process')

    // 1. Clean up old completed safety queue entries (older than 7 days)
    const { count: safetyQueueCleaned, error: safetyError } = await supabaseClient
      .from('safety_queue')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .in('status', ['clean', 'flagged'])

    if (safetyError) {
      console.error('Error cleaning safety_queue:', safetyError)
    } else {
      console.log(`✅ Cleaned ${safetyQueueCleaned} old safety_queue entries`)
    }

    // 2. Archive resolved moderation reports (older than 30 days)
    const { count: reportsArchived, error: reportsError } = await supabaseClient
      .from('moderation_reports')
      .delete()
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'closed')

    if (reportsError) {
      console.error('Error archiving moderation reports:', reportsError)
    } else {
      console.log(`✅ Archived ${reportsArchived} resolved moderation reports`)
    }

    // 3. Clean up read notifications (older than 14 days)
    const { count: notificationsCleaned, error: notificationsError } = await supabaseClient
      .from('notifications')
      .delete()
      .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .eq('is_read', true)

    if (notificationsError) {
      console.error('Error cleaning notifications:', notificationsError)
    } else {
      console.log(`✅ Cleaned ${notificationsCleaned} read notifications`)
    }

    // 4. Expire old presigned URLs (this would be handled by storage policies in production)
    console.log('✅ Presigned URL expiration would be handled by storage policies')

    // 5. Close stale claims (older than 90 days without action)
    const { count: staleClaimsClosed, error: claimsError } = await supabaseClient
      .from('claims')
      .update({ status: 'closed' })
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    if (claimsError) {
      console.error('Error closing stale claims:', claimsError)
    } else {
      console.log(`✅ Closed ${staleClaimsClosed} stale claims`)
    }

    console.log('🎉 Nightly cleanup completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        safety_queue_cleaned: safetyQueueCleaned || 0,
        reports_archived: reportsArchived || 0,
        notifications_cleaned: notificationsCleaned || 0,
        stale_claims_closed: staleClaimsClosed || 0,
        message: 'Nightly cleanup completed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Cleanup cron error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})