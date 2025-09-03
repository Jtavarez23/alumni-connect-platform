import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check manual grants first
    const { data: manualGrant } = await supabaseClient
      .from("subscription_management")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_manual_grant", true)
      .single();

    if (manualGrant) {
    // Update both profiles and subscribers tables for manual grants
    await supabaseClient
      .from("profiles")
      .update({
        subscription_status: "premium",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    await supabaseClient
      .from("subscribers")
      .upsert({
        user_id: user.id,
        email: user.email,
        subscribed: true,
        subscription_tier: "premium",
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      return new Response(JSON.stringify({
        subscribed: true,
        subscription_tier: "premium",
        is_manual_grant: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check Stripe subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
    // Update both profiles and subscribers tables for no subscription
    await supabaseClient
      .from("profiles")
      .update({
        subscription_status: "free",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    await supabaseClient
      .from("subscribers")
      .upsert({
        user_id: user.id,
        email: user.email,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    
    // Update customer ID if not stored
    await supabaseClient
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    
    // Determine subscription details
    let subscriptionTier = null;
    let subscriptionEnd = null;
    
    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Determine tier based on price
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      
      if (amount <= 999) {
        subscriptionTier = "Basic";
      } else if (amount <= 1999) {
        subscriptionTier = "Premium";
      } else {
        subscriptionTier = "Enterprise";
      }
    }

    // Update both profiles and subscribers tables
    await supabaseClient
      .from("profiles")
      .update({
        subscription_status: hasActiveSub ? "premium" : "free",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    await supabaseClient
      .from("subscribers")
      .upsert({
        user_id: user.id,
        email: user.email,
        stripe_customer_id: customerId,
        subscribed: hasActiveSub,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: hasActiveSub ? "premium" : "free"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in check-subscription:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});