import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Users, 
  Download,
  Mail,
  ArrowLeft,
  Ticket,
  Clock
} from 'lucide-react';
import { useEvent } from '@/hooks/useEvents';
import { useUserEventOrders, ticketUtils } from '@/hooks/useEventTickets';
import { format } from 'date-fns';

export function EventPaymentSuccess() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const { data: eventData, isLoading: eventLoading } = useEvent(eventId!);
  const { data: orders, isLoading: ordersLoading } = useUserEventOrders(eventId);

  // Find the most recent paid order (likely the one just created)
  const recentOrder = orders?.find(order => 
    order.status === 'paid' && 
    order.stripe_payment_intent
  );

  useEffect(() => {
    if (recentOrder) {
      setOrderDetails(recentOrder);
    }
  }, [recentOrder]);

  if (eventLoading || ordersLoading) {
    return (
      <AppLayout title="Processing Payment...">
        <div className="max-w-2xl mx-auto p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-muted-foreground">
                Confirming your payment and generating tickets...
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!eventData?.event || !orderDetails) {
    return (
      <AppLayout title="Payment Status">
        <div className="max-w-2xl mx-auto p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Payment Status Unclear</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't find your order details. Please check your email for confirmation or contact support.
              </p>
              <div className="space-y-2">
                <Link to={`/events/${eventId}`}>
                  <Button>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Event
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const event = eventData.event;
  const ticket = orderDetails.ticket;

  return (
    <AppLayout title="Payment Successful">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Success Header */}
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-green-700">
              Your tickets have been confirmed and sent to your email.
            </p>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Order ID</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {orderDetails.id.slice(0, 8).toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Ticket Type</span>
              <span className="font-semibold">{ticket?.name}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Quantity</span>
              <span className="font-semibold">{orderDetails.qty}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Total Paid</span>
              <span className="font-semibold">
                {ticketUtils.formatPrice(orderDetails.total_cents, orderDetails.currency)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Purchase Date</span>
              <span>{format(new Date(orderDetails.updated_at), 'PPP p')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{event.title}</h3>
              {event.description && (
                <p className="text-muted-foreground mt-2 text-sm">
                  {event.description}
                </p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {format(new Date(event.starts_at), 'EEEE, PPP')}
                  </div>
                  <div className="text-muted-foreground">
                    {format(new Date(event.starts_at), 'p')}
                    {event.ends_at && ` - ${format(new Date(event.ends_at), 'p')}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {event.is_virtual ? (
                  <>
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Virtual Event</div>
                      <div className="text-muted-foreground">
                        Access details will be emailed
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">In Person</div>
                      <div className="text-muted-foreground">
                        {event.location || 'Location TBD'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Check Your Email</h4>
                <p className="text-sm text-muted-foreground">
                  Your ticket confirmation and event details have been sent to your email address.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Add to Calendar</h4>
                <p className="text-sm text-muted-foreground">
                  Don't forget to add this event to your calendar so you don't miss it!
                </p>
              </div>
            </div>

            {event.is_virtual && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Virtual Access</h4>
                  <p className="text-sm text-muted-foreground">
                    Virtual event access details will be emailed 24 hours before the event starts.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={`/events/${eventId}`}>
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Event
            </Button>
          </Link>
          
          <Link to="/events">
            <Button className="w-full sm:w-auto">
              Browse More Events
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

export default EventPaymentSuccess;