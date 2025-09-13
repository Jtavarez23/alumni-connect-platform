import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Ticket, 
  Users, 
  Clock, 
  CreditCard, 
  Plus, 
  Minus,
  AlertCircle,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { useEventTickets, usePurchaseEventTicket, ticketUtils } from '@/hooks/useEventTickets';
import { format } from 'date-fns';

interface TicketPurchaseProps {
  eventId: string;
  event: {
    title: string;
    starts_at: string;
    location?: string;
    is_virtual: boolean;
  };
  className?: string;
}

interface TicketSelection {
  ticket_id: string;
  quantity: number;
}

export function TicketPurchase({ eventId, event, className = '' }: TicketPurchaseProps) {
  const [selections, setSelections] = useState<TicketSelection[]>([]);
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>(['']);
  const [showAttendeeForm, setShowAttendeeForm] = useState(false);

  const { data: tickets, isLoading, error } = useEventTickets(eventId);
  const purchaseMutation = usePurchaseEventTicket();

  const updateQuantity = (ticketId: string, quantity: number) => {
    setSelections(prev => {
      const existing = prev.find(s => s.ticket_id === ticketId);
      if (existing) {
        if (quantity <= 0) {
          return prev.filter(s => s.ticket_id !== ticketId);
        }
        return prev.map(s => 
          s.ticket_id === ticketId ? { ...s, quantity } : s
        );
      } else if (quantity > 0) {
        return [...prev, { ticket_id: ticketId, quantity }];
      }
      return prev;
    });
  };

  const getQuantity = (ticketId: string): number => {
    return selections.find(s => s.ticket_id === ticketId)?.quantity || 0;
  };

  const totalQuantity = selections.reduce((sum, s) => sum + s.quantity, 0);
  const totalCost = selections.reduce((sum, selection) => {
    const ticket = tickets?.find(t => t.id === selection.ticket_id);
    return sum + (ticket ? ticket.price_cents * selection.quantity : 0);
  }, 0);

  const handlePurchase = async () => {
    if (selections.length === 0) return;

    // For multiple tickets, we'll process the first one
    // In a real implementation, you'd want to handle multiple ticket types
    const firstSelection = selections[0];
    const validEmails = attendeeEmails.filter(email => email.trim());

    await purchaseMutation.mutateAsync({
      event_id: eventId,
      ticket_id: firstSelection.ticket_id,
      quantity: firstSelection.quantity,
      attendee_emails: validEmails.length > 0 ? validEmails : undefined
    });
  };

  const addEmailField = () => {
    if (attendeeEmails.length < totalQuantity) {
      setAttendeeEmails(prev => [...prev, '']);
    }
  };

  const updateEmail = (index: number, email: string) => {
    setAttendeeEmails(prev => 
      prev.map((e, i) => i === index ? email : e)
    );
  };

  const removeEmail = (index: number) => {
    if (attendeeEmails.length > 1) {
      setAttendeeEmails(prev => prev.filter((_, i) => i !== index));
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading tickets...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load tickets. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Free Event</h3>
          <p className="text-muted-foreground">
            This event is free to attend. No tickets required.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Event Tickets
        </CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(event.starts_at), 'PPP p')}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {event.is_virtual ? 'Virtual Event' : event.location || 'Location TBD'}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ticket Types */}
        <div className="space-y-4">
          {tickets.map(ticket => {
            const quantity = getQuantity(ticket.id);
            const isAvailable = ticketUtils.isTicketAvailable(ticket);
            const statusMessage = ticketUtils.getTicketStatusMessage(ticket);
            
            return (
              <div key={ticket.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold">{ticket.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-lg font-bold text-primary">
                        {ticketUtils.formatPrice(ticket.price_cents, ticket.currency)}
                      </span>
                      <Badge variant={isAvailable ? 'secondary' : 'destructive'}>
                        {statusMessage}
                      </Badge>
                    </div>
                  </div>
                  
                  {isAvailable && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(ticket.id, Math.max(0, quantity - 1))}
                        disabled={quantity === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="w-8 text-center font-semibold">
                        {quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(ticket.id, quantity + 1)}
                        disabled={ticket.quantity !== null && quantity >= (ticket.available || 0)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {ticket.sales_start && new Date(ticket.sales_start) > new Date() && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Sales start on {format(new Date(ticket.sales_start), 'PPP p')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            );
          })}
        </div>

        {/* Purchase Summary */}
        {totalQuantity > 0 && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total ({totalQuantity} ticket{totalQuantity !== 1 ? 's' : ''})</span>
                <span>{ticketUtils.formatPrice(totalCost)}</span>
              </div>

              {/* Attendee Email Form */}
              {totalQuantity > 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Attendee Emails (optional)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAttendeeForm(!showAttendeeForm)}
                    >
                      {showAttendeeForm ? 'Hide' : 'Add'} Emails
                    </Button>
                  </div>
                  
                  {showAttendeeForm && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Add email addresses for each attendee to send them individual tickets.
                      </p>
                      
                      {attendeeEmails.map((email, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            type="email"
                            placeholder={`Attendee ${index + 1} email`}
                            value={email}
                            onChange={(e) => updateEmail(index, e.target.value)}
                          />
                          {attendeeEmails.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeEmail(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      {attendeeEmails.length < totalQuantity && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addEmailField}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Email
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handlePurchase}
                disabled={purchaseMutation.isPending}
              >
                {purchaseMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Purchase Tickets
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                You'll be redirected to Stripe to complete your payment securely.
              </p>
            </div>
          </>
        )}

        {tickets.length > 0 && totalQuantity === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select ticket quantities above to purchase tickets for this event.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}