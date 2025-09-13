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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_EVENTS");
  const signature = req.headers.get("stripe-signature");

  try {
    if (!signature || !webhookSecret) {
      throw new Error("Missing stripe signature or webhook secret");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabaseClient);
        break;
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent, supabaseClient);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent, supabaseClient);
        break;
      }
      
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session, supabaseClient);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabaseClient: any
) {
  const { event_id, ticket_id, order_id, user_id } = session.metadata || {};
  
  if (!order_id || !user_id) {
    throw new Error('Missing required metadata');
  }

  // Update order status to paid
  const { error: orderError } = await supabaseClient
    .from('event_orders')
    .update({
      status: 'paid',
      stripe_payment_intent: session.payment_intent,
      updated_at: new Date().toISOString()
    })
    .eq('id', order_id);

  if (orderError) {
    throw new Error(`Failed to update order: ${orderError.message}`);
  }

  // Create event attendee records
  const { data: orderData } = await supabaseClient
    .from('event_orders')
    .select('*, event_id, qty, attendee_emails')
    .eq('id', order_id)
    .single();

  if (orderData) {
    const attendeeEmails = orderData.attendee_emails || [session.customer_details?.email];
    
    // Create attendee records
    for (const email of attendeeEmails) {
      // First try to find user by email, otherwise use purchaser
      let attendeeUserId = user_id;
      if (email !== session.customer_details?.email) {
        const { data: userData } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
        
        if (userData) {
          attendeeUserId = userData.id;
        }
      }

      await supabaseClient
        .from('event_attendees')
        .insert({
          event_id: orderData.event_id,
          user_id: attendeeUserId,
          order_id: order_id,
          status: 'registered'
        })
        .onConflict('event_id, user_id')
        .merge();
    }
  }

  console.log(`Checkout completed for order ${order_id}`);
}

async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  supabaseClient: any
) {
  const { order_id } = paymentIntent.metadata || {};
  
  if (order_id) {
    await supabaseClient
      .from('event_orders')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)
      .eq('stripe_payment_intent', paymentIntent.id);
  }

  console.log(`Payment succeeded for order ${order_id}`);
}

async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabaseClient: any
) {
  const { order_id } = paymentIntent.metadata || {};
  
  if (order_id) {
    await supabaseClient
      .from('event_orders')
      .update({
        status: 'created', // Keep as created so they can retry
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)
      .eq('stripe_payment_intent', paymentIntent.id);
  }

  console.log(`Payment failed for order ${order_id}`);
}

async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
  supabaseClient: any
) {
  const { order_id } = session.metadata || {};
  
  if (order_id) {
    await supabaseClient
      .from('event_orders')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id);
  }

  console.log(`Checkout expired for order ${order_id}`);
}