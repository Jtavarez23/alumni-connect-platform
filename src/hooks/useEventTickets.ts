import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PurchaseTicketParams {
  event_id: string;
  ticket_id: string;
  quantity: number;
  attendee_emails?: string[];
}

interface EventTicket {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  quantity: number | null;
  quantity_sold: number;
  sales_start?: string;
  sales_end?: string;
}

// Hook for purchasing event tickets
export function usePurchaseEventTicket() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ event_id, ticket_id, quantity, attendee_emails }: PurchaseTicketParams) => {
      const { data, error } = await supabase.functions.invoke('create-event-checkout', {
        body: {
          event_id,
          ticket_id, 
          quantity,
          attendee_emails
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Purchase failed',
        description: error.message || 'Failed to create checkout session',
        variant: 'destructive',
      });
    },
  });
}

// Hook for getting event tickets with availability
export function useEventTickets(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-tickets', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID required');

      // Get tickets with sold count
      const { data, error } = await supabase
        .from('event_tickets')
        .select(`
          *,
          sold_count:event_orders(qty.sum())
        `)
        .eq('event_id', eventId)
        .eq('event_orders.status', 'paid');

      if (error) throw error;

      // Calculate availability
      return data.map(ticket => ({
        ...ticket,
        quantity_sold: ticket.sold_count?.[0]?.sum || 0,
        available: ticket.quantity ? ticket.quantity - (ticket.sold_count?.[0]?.sum || 0) : 999999,
        is_available: ticket.quantity ? (ticket.quantity - (ticket.sold_count?.[0]?.sum || 0)) > 0 : true,
        sales_active: !ticket.sales_start || new Date(ticket.sales_start) <= new Date(),
        sales_ended: ticket.sales_end && new Date(ticket.sales_end) < new Date()
      }));
    },
    enabled: !!eventId,
  });
}

// Hook for getting user's orders for an event
export function useUserEventOrders(eventId: string | undefined) {
  return useQuery({
    queryKey: ['user-event-orders', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID required');

      const { data, error } = await supabase
        .from('event_orders')
        .select(`
          *,
          ticket:event_tickets(name, price_cents, currency),
          event:events(title, starts_at)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

// Hook for ticket validation (for event organizers)
export function useValidateTicket() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, validate }: { orderId: string; validate: boolean }) => {
      // This would typically be an RPC function to validate attendance
      const { data, error } = await supabase
        .from('event_attendees')
        .update({ 
          status: validate ? 'attended' : 'registered',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { validate }) => {
      toast({
        title: validate ? 'Ticket validated' : 'Validation removed',
        description: validate 
          ? 'Attendee has been marked as attended'
          : 'Attendee status reset to registered',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Validation failed',
        description: error.message || 'Failed to update attendance',
        variant: 'destructive',
      });
    },
  });
}

// Hook for getting ticket sales metrics (for event organizers)
export function useEventTicketMetrics(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-ticket-metrics', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID required');

      const { data, error } = await supabase
        .from('event_orders')
        .select(`
          id,
          qty,
          total_cents,
          status,
          created_at,
          ticket:event_tickets(name, price_cents)
        `)
        .eq('event_id', eventId);

      if (error) throw error;

      // Calculate metrics
      const paidOrders = data.filter(order => order.status === 'paid');
      const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total_cents, 0);
      const totalTicketsSold = paidOrders.reduce((sum, order) => sum + order.qty, 0);
      
      const salesByTicket = data.reduce((acc, order) => {
        if (order.status === 'paid' && order.ticket) {
          const ticketName = order.ticket.name;
          if (!acc[ticketName]) {
            acc[ticketName] = { count: 0, revenue: 0 };
          }
          acc[ticketName].count += order.qty;
          acc[ticketName].revenue += order.total_cents;
        }
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      return {
        total_orders: data.length,
        paid_orders: paidOrders.length,
        pending_orders: data.filter(order => order.status === 'created').length,
        total_tickets_sold: totalTicketsSold,
        total_revenue: totalRevenue,
        sales_by_ticket: salesByTicket,
        recent_orders: data.slice(0, 10)
      };
    },
    enabled: !!eventId,
  });
}

// Utility functions
export const ticketUtils = {
  formatPrice: (priceCents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(priceCents / 100);
  },

  isTicketAvailable: (ticket: EventTicket): boolean => {
    const now = new Date();
    const salesStarted = !ticket.sales_start || new Date(ticket.sales_start) <= now;
    const salesNotEnded = !ticket.sales_end || new Date(ticket.sales_end) > now;
    const hasQuantity = !ticket.quantity || ticket.quantity > ticket.quantity_sold;
    
    return salesStarted && salesNotEnded && hasQuantity;
  },

  getTicketStatusMessage: (ticket: EventTicket): string => {
    const now = new Date();
    
    if (ticket.sales_start && new Date(ticket.sales_start) > now) {
      return `Sales start ${new Date(ticket.sales_start).toLocaleDateString()}`;
    }
    
    if (ticket.sales_end && new Date(ticket.sales_end) <= now) {
      return 'Sales ended';
    }
    
    if (ticket.quantity && ticket.quantity_sold >= ticket.quantity) {
      return 'Sold out';
    }
    
    if (ticket.quantity) {
      const remaining = ticket.quantity - ticket.quantity_sold;
      return `${remaining} remaining`;
    }
    
    return 'Available';
  }
};