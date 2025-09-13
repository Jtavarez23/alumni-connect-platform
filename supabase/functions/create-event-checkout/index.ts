import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventTicketRequest {
  event_id: string;
  ticket_id: string;
  quantity: number;
  attendee_emails?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const requestData: EventTicketRequest = await req.json();
    const { event_id, ticket_id, quantity, attendee_emails } = requestData;

    // Get event and ticket details
    const { data: eventData, error: eventError } = await supabaseClient
      .from('events')
      .select(`
        id, title, starts_at, location, is_virtual,
        tickets:event_tickets!inner(*)
      `)
      .eq('id', event_id)
      .eq('event_tickets.id', ticket_id)
      .single();

    if (eventError || !eventData) {
      throw new Error('Event or ticket not found');
    }

    const ticket = eventData.tickets[0];
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Check ticket availability
    const { data: soldTickets } = await supabaseClient
      .from('event_orders')
      .select('qty')
      .eq('ticket_id', ticket_id)
      .eq('status', 'paid');

    const totalSold = soldTickets?.reduce((sum, order) => sum + order.qty, 0) || 0;
    const available = ticket.quantity ? ticket.quantity - totalSold : 999999;

    if (quantity > available) {
      throw new Error(`Only ${available} tickets available`);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      });
      customerId = customer.id;
    }

    // Create order record
    const { data: orderData, error: orderError } = await supabaseClient
      .from('event_orders')
      .insert({
        event_id,
        ticket_id,
        purchaser_id: user.id,
        qty: quantity,
        total_cents: ticket.price_cents * quantity,
        currency: ticket.currency,
        status: 'created',
        attendee_emails: attendee_emails || [user.email]
      })
      .select()
      .single();

    if (orderError) {
      throw new Error('Failed to create order');
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: ticket.currency.toLowerCase(),
            product_data: {
              name: `${eventData.title} - ${ticket.name}`,
              description: `Event: ${eventData.title}\nDate: ${new Date(eventData.starts_at).toLocaleDateString()}\nLocation: ${eventData.is_virtual ? 'Virtual Event' : eventData.location}`,
              images: eventData.cover_image_url ? [eventData.cover_image_url] : undefined,
            },
            unit_amount: ticket.price_cents,
          },
          quantity,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/events/${event_id}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/events/${event_id}?checkout=cancelled`,
      metadata: {
        event_id,
        ticket_id,
        order_id: orderData.id,
        user_id: user.id,
      },
      payment_intent_data: {
        metadata: {
          event_id,
          ticket_id,
          order_id: orderData.id,
          user_id: user.id,
        },
      },
    });

    // Update order with Stripe session info
    await supabaseClient
      .from('event_orders')
      .update({
        stripe_payment_intent: session.payment_intent as string,
      })
      .eq('id', orderData.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      order_id: orderData.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Event checkout error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});