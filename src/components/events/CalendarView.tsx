// Calendar View Component
// Month/week calendar view for events

import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCalendarEvents } from '@/hooks/useEvents';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { Event } from '@/types/events';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const { data: events = [], isLoading } = useCalendarEvents(calendarStart, calendarEnd);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.starts_at);
      return format(eventDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  const getSelectedDateEvents = () => {
    if (!selectedDate) return [];
    return getEventsForDate(selectedDate);
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              {/* Calendar */}
              <div className="grid grid-cols-7 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {days.map((day, dayIdx) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isDayToday = isToday(day);
                  const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[120px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors",
                        !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                        isDayToday && "bg-primary/5",
                        isSelected && "bg-primary/10 ring-2 ring-primary/20"
                      )}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        isDayToday && "text-primary"
                      )}>
                        {format(day, 'd')}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <CalendarEventItem key={event.id} event={event} />
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Date Events */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a date'}
              </h3>
              
              <div className="space-y-3">
                {selectedDate ? (
                  getSelectedDateEvents().length > 0 ? (
                    getSelectedDateEvents().map((event) => (
                      <SelectedDateEvent key={event.id} event={event} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No events scheduled</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click on a date to see events
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span>Your Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span>School Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500"></div>
                <span>Alumni Events</span>
              </div>
            </div>
            <div>
              Showing {events.length} events this month
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarEventItem({ event }: { event: any }) {
  const eventColor = event.host_type === 'school' ? 'bg-green-500' : 
                    event.host_type === 'user' ? 'bg-blue-500' : 'bg-purple-500';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={cn(
          "w-full text-left p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity",
          eventColor,
          "text-white"
        )}>
          <div className="font-medium truncate">{event.title}</div>
          <div className="opacity-90 truncate">
            {format(new Date(event.starts_at), 'h:mm a')}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <h4 className="font-semibold">{event.title}</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {format(new Date(event.starts_at), 'h:mm a')}
              {event.ends_at && ` - ${format(new Date(event.ends_at), 'h:mm a')}`}
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {event.location}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {event.attendee_count || 0} attending
            </div>
          </div>
          <Link to={`/events/${event.id}`}>
            <Button size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SelectedDateEvent({ event }: { event: any }) {
  return (
    <Link to={`/events/${event.id}`}>
      <div className="p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {event.title}
            </h4>
          </div>
          
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {format(new Date(event.starts_at), 'h:mm a')}
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3" />
              {event.attendee_count || 0} attending
            </div>
          </div>

          <div className="flex gap-1">
            {event.is_virtual && (
              <Badge variant="outline" className="text-xs">Virtual</Badge>
            )}
            {event.ticketing_enabled && (
              <Badge variant="outline" className="text-xs">Paid</Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}