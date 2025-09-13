import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Download,
  Settings,
  Mail,
  Edit,
  BarChart3,
  Ticket,
  Clock,
  MapPin,
  Eye
} from 'lucide-react';
import { useEvent } from '@/hooks/useEvents';
import { useEventTicketMetrics, ticketUtils } from '@/hooks/useEventTickets';
import { format } from 'date-fns';

export function EventDashboard() {
  const { eventId } = useParams<{ eventId: string }>();
  
  const { data: eventData, isLoading: eventLoading } = useEvent(eventId!);
  const { data: metrics, isLoading: metricsLoading } = useEventTicketMetrics(eventId);

  if (eventLoading) {
    return (
      <AppLayout title="Event Dashboard">
        <div className="p-6">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!eventData?.event) {
    return (
      <AppLayout title="Event Not Found">
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The event you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link to="/events">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const event = eventData.event;
  const tickets = eventData.tickets || [];

  return (
    <AppLayout title={`Managing: ${event.title}`}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/events/${eventId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                View Event
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <p className="text-muted-foreground">
                {format(new Date(event.starts_at), 'PPP p')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link to={`/events/${eventId}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </Button>
            </Link>
            <Button>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Attendees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{event.attendee_count}</div>
              <p className="text-xs text-muted-foreground">
                {event.max_capacity ? `of ${event.max_capacity} capacity` : 'No limit'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Tickets Sold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.total_tickets_sold || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics?.paid_orders || 0} completed orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ticketUtils.formatPrice(metrics?.total_revenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics?.pending_orders || 0} pending orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Analytics coming soon
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Event Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(event.starts_at), 'PPP p')}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Location</label>
                      <p className="flex items-center gap-2">
                        {event.is_virtual ? (
                          <>
                            <Users className="w-4 h-4" />
                            Virtual Event
                          </>
                        ) : (
                          <>
                            <MapPin className="w-4 h-4" />
                            {event.location || 'Location TBD'}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Visibility</label>
                      <div>
                        <Badge variant="secondary">{event.visibility.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Capacity</label>
                      <p>{event.max_capacity || 'Unlimited'}</p>
                    </div>
                  </div>
                </div>

                {event.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm mt-1">{event.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ticket Sales by Type */}
            {event.ticketing_enabled && metrics?.sales_by_ticket && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Sales by Ticket Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(metrics.sales_by_ticket).map(([ticketName, sales]) => (
                      <div key={ticketName} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{ticketName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {sales.count} ticket{sales.count !== 1 ? 's' : ''} sold
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {ticketUtils.formatPrice(sales.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attendees">
            <Card>
              <CardHeader>
                <CardTitle>Attendee Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Attendee management features coming soon. You'll be able to check in attendees, 
                  send messages, and export attendee lists.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Free Event</h3>
                    <p className="text-muted-foreground mb-4">
                      This event doesn't have paid ticketing enabled.
                    </p>
                    <Button variant="outline">
                      Enable Ticketing
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket: any) => (
                      <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{ticket.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {ticketUtils.formatPrice(ticket.price_cents, ticket.currency)}
                            {ticket.quantity && ` • ${ticket.quantity} available`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {ticket.quantity_sold} sold
                          </Badge>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sales analytics and trends will be displayed here.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Attendance predictions based on registration trends.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 pt-6 border-t">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          
          <Button variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Message Attendees
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

export default EventDashboard;