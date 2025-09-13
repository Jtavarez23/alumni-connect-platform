// Event Card Component
// Displays event information in card or list format

import React from 'react';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Video,
  ExternalLink,
  Ticket,
  Shield,
  Globe,
  School,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRSVPEvent } from '@/hooks/useEvents';
import { cn } from '@/lib/utils';
import type { Event } from '@/types/events';
import { QuickAddToCalendar } from './AddToCalendar';

interface EventCardProps {
  event: Event;
  variant?: 'card' | 'list' | 'compact';
  className?: string;
}

export function EventCard({ event, variant = 'card', className = '' }: EventCardProps) {
  const rsvpMutation = useRSVPEvent();

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE');
    return format(date, 'MMM d, yyyy');
  };

  const formatEventTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return <Globe className="w-4 h-4" />;
      case 'school_only': return <School className="w-4 h-4" />;
      case 'alumni_only': return <UserCheck className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const handleRSVP = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (event.ticketing_enabled) {
      // Redirect to ticket purchase page
      window.location.href = `/events/${event.id}/tickets`;
      return;
    }

    try {
      await rsvpMutation.mutateAsync({
        eventId: event.id,
        register: !event.is_attending
      });
    } catch (error) {
      console.error('RSVP failed:', error);
    }
  };

  if (variant === 'list') {
    return (
      <Link to={`/events/${event.id}`}>
        <Card className={cn('hover:shadow-md transition-shadow cursor-pointer', className)}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Date/Time Column */}
              <div className="flex-shrink-0 sm:w-32">
                <div className="text-center sm:text-left">
                  <div className="text-lg font-semibold text-primary">
                    {format(new Date(event.starts_at), 'MMM d')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatEventTime(event.starts_at)}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">
                      {event.title}
                    </h3>
                    {event.host_name && (
                      <p className="text-sm text-muted-foreground">
                        by {event.host_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getVisibilityIcon(event.visibility)}
                    {event.ticketing_enabled && (
                      <Ticket className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {event.is_virtual ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    <span className="truncate">
                      {event.is_virtual ? 'Virtual Event' : event.location || 'Location TBD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>
                      {event.attendee_count}
                      {event.max_capacity && ` / ${event.max_capacity}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex-shrink-0 self-center">
                <Button
                  size="sm"
                  variant={event.is_attending ? "outline" : "default"}
                  onClick={handleRSVP}
                  disabled={rsvpMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {event.ticketing_enabled ? (
                    'Get Tickets'
                  ) : event.is_attending ? (
                    'Registered'
                  ) : (
                    'RSVP'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Card variant (default)
  return (
    <Link to={`/events/${event.id}`}>
      <Card className={cn('hover:shadow-lg transition-shadow cursor-pointer h-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {event.host_avatar && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={event.host_avatar} />
                  <AvatarFallback>
                    {event.host_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground truncate">
                  {event.host_name || 'Anonymous'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {getVisibilityIcon(event.visibility)}
              {event.ticketing_enabled && (
                <Ticket className="w-4 h-4 text-primary" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              {event.title}
            </h3>
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {event.description}
            </p>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>
                {formatEventDate(event.starts_at)} at {formatEventTime(event.starts_at)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {event.is_virtual ? (
                <Video className="w-4 h-4 flex-shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">
                {event.is_virtual ? 'Virtual Event' : event.location || 'Location TBD'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>
                {event.attendee_count} attending
                {event.max_capacity && ` (${event.max_capacity} max)`}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {event.school_name && (
              <Badge variant="secondary" className="text-xs">
                {event.school_name}
              </Badge>
            )}
            {event.is_virtual && (
              <Badge variant="outline" className="text-xs">
                Virtual
              </Badge>
            )}
            {event.ticketing_enabled && (
              <Badge variant="outline" className="text-xs text-primary">
                Paid Event
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0 space-y-2">
          <Button
            className="w-full"
            variant={event.is_attending ? "outline" : "default"}
            onClick={handleRSVP}
            disabled={rsvpMutation.isPending}
          >
            {event.ticketing_enabled ? (
              <>
                <Ticket className="w-4 h-4 mr-2" />
                Get Tickets
              </>
            ) : event.is_attending ? (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                Registered
              </>
            ) : (
              'RSVP Free'
            )}
          </Button>
          
          <QuickAddToCalendar 
            event={{
              id: event.id,
              title: event.title,
              description: event.description,
              starts_at: event.starts_at,
              ends_at: event.ends_at,
              location: event.location,
              is_virtual: event.is_virtual,
              host_name: event.host_name,
              attendee_count: event.attendee_count,
              max_capacity: event.max_capacity
            }}
            className="w-full justify-center text-xs"
          />
        </CardFooter>
      </Card>
    </Link>
  );
}