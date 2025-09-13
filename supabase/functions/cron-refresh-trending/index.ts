// Alumni Connect - Cron Job to Refresh Trending Materialized View
// AC-ARCH-003 compliant cron implementation

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

    // Refresh the trending materialized view
    const { error } = await supabaseClient.rpc('refresh_materialized_view', {
      view_name: 'mv_trending'
    })

    if (error) {
      throw new Error(`Failed to refresh trending view: ${error.message}`)
    }

    console.log('✅ Trending materialized view refreshed successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Trending view refreshed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Cron refresh trending error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})