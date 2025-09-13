// Alumni Connect - Weekly Digest Cron Job
// AC-ARCH-003 compliant weekly email digest implementation

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

    // Get users who want to receive weekly digests
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select('id, email, first_name, last_name, email_preferences')
      .eq('email_preferences->>weekly_digest', 'true')
      .limit(100) // Process in batches

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to send digest to' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`📧 Preparing weekly digest for ${users.length} users`)

    // For each user, build their personalized digest
    for (const user of users) {
      try {
        // Get user's recent activity and notifications
        const { data: userActivity } = await supabaseClient
          .from('notifications')
          .select('kind, payload, created_at')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10)

        // Get trending posts from user's network
        const { data: trendingPosts } = await supabaseClient
          .rpc('get_network_feed', { 
            p_user_id: user.id, 
            p_limit: 5 
          })

        // Build digest content
        const digestContent = {
          user: {
            name: `${user.first_name} ${user.last_name}`,
            email: user.email
          },
          unreadNotifications: userActivity?.length || 0,
          trendingPosts: trendingPosts?.length || 0,
          // Additional digest content would go here
        }

        console.log(`📨 Digest prepared for ${user.email}`)
        
        // In production, this would send an actual email via Resend, SendGrid, etc.
        // For now, we'll just log it
        
        // Add small delay between processing users
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError)
        // Continue with other users
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: users.length,
        message: 'Weekly digest processing completed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Weekly digest cron error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})