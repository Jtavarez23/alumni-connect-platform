// Events Discovery Page
// Main events listing and discovery interface

import React, { useState } from 'react';
import { Plus, Calendar, MapPin, Users, Clock, Search, Filter, Grid, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEvents } from '@/hooks/useEvents';
import { EventCard } from '@/components/events/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { CalendarView } from '@/components/events/CalendarView';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AppLayout } from '@/components/layout/AppLayout';
import type { EventFilters as EventFiltersType } from '@/types/events';

export function Events() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EventFiltersType>({});
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: eventsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useEvents(filters);

  const allEvents = eventsData?.pages.flatMap(page => page.events) || [];

  // Filter events by search query on client side for better UX
  const filteredEvents = allEvents.filter(event =>
    !searchQuery || 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFilterChange = (newFilters: EventFiltersType) => {
    setFilters(newFilters);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Failed to load events</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-shrink-0"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-2"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-2"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="px-2"
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <EventFilters
              filters={filters}
              onChange={handleFilterChange}
              onClose={() => setShowFilters(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'grid' | 'calendar')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6">
          {filteredEvents.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} variant="card" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          {filteredEvents.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} variant="list" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarView />
        </TabsContent>
      </Tabs>

      {/* Load More */}
      {hasNextPage && viewMode !== 'calendar' && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Loading...
              </>
            ) : (
              'Load More Events'
            )}
          </Button>
        </div>
      )}

      {/* Results Summary */}
      {filteredEvents.length > 0 && (
        <div className="text-center text-sm text-muted-foreground border-t pt-4">
          Showing {filteredEvents.length} events
          {eventsData?.pages[0]?.total_count && 
            ` of ${eventsData.pages[0].total_count} total`
          }
        </div>
      )}
      </div>
    </AppLayout>
  );
}

export default Events;

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="text-center py-12">
      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">
        {searchQuery ? 'No events found' : 'No upcoming events'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {searchQuery
          ? `No events match "${searchQuery}". Try adjusting your search or filters.`
          : 'Be the first to create an event for your class or community!'
        }
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/events/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create First Event
          </Button>
        </Link>
        {searchQuery && (
          <Button variant="outline" onClick={() => setSearchQuery('')}>
            Clear Search
          </Button>
        )}
      </div>
    </div>
  );
}