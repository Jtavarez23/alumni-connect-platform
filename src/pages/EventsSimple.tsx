// Events Page - Simplified Version
import React, { useState } from 'react';
import { Plus, Calendar, MapPin, Users, Search, Filter, Grid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';

export function Events() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('grid');

  // Mock data for now since database RPC functions don't exist yet
  const mockEvents = [
    {
      id: '1',
      title: 'Class of 2010 Reunion',
      description: 'Join us for our 15-year reunion celebration!',
      location: 'Downtown Convention Center',
      starts_at: '2024-07-15T18:00:00Z',
      school_name: 'Lincoln High School',
      attendee_count: 45,
      is_virtual: false,
    },
    {
      id: '2', 
      title: 'Alumni Networking Mixer',
      description: 'Connect with fellow alumni in the tech industry',
      location: 'Virtual Event',
      starts_at: '2024-07-20T19:00:00Z',
      school_name: 'Tech University',
      attendee_count: 23,
      is_virtual: true,
    }
  ];

  return (
    <AppLayout title="Events">
      <div className="space-y-6 pb-20 md:pb-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Events</h1>
            <p className="text-muted-foreground">
              Discover reunions, meetups, and alumni gatherings
            </p>
          </div>
          <Link to="/events/create">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Events Grid */}
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "space-y-4"
        }>
          {mockEvents.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{event.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    July 15, 2024
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {event.is_virtual ? 'Virtual' : event.location}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {event.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{event.school_name}</Badge>
                    {event.is_virtual && (
                      <Badge variant="outline">Virtual</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {event.attendee_count}
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {mockEvents.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No events found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Be the first to create an event for your class or community!
            </p>
            <Link to="/events/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Event
              </Button>
            </Link>
          </div>
        )}

        {/* Note about database */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is showing mock data. Database migrations need to be applied to enable full functionality.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

export default Events;