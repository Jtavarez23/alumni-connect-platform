import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Plus, 
  Download,
  ExternalLink,
  Check,
  Clock
} from 'lucide-react';
import { 
  generateCalendarUrls, 
  downloadICSFile, 
  supportsICSDownload,
  type CalendarEvent
} from '@/lib/calendar';
import { useToast } from '@/components/ui/use-toast';

interface AddToCalendarProps {
  event: {
    id: string;
    title: string;
    description?: string;
    starts_at: string;
    ends_at?: string;
    location?: string;
    is_virtual: boolean;
    host_name?: string;
    attendee_count?: number;
    max_capacity?: number;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function AddToCalendar({ 
  event, 
  variant = 'default', 
  size = 'default',
  className = '' 
}: AddToCalendarProps) {
  const [isAdded, setIsAdded] = useState(false);
  const { toast } = useToast();

  const calendarEvent: CalendarEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    start: new Date(event.starts_at),
    end: event.ends_at ? new Date(event.ends_at) : undefined,
    location: event.location,
    isVirtual: event.is_virtual,
    organizer: event.host_name ? { name: event.host_name } : undefined,
    attendeeCount: event.attendee_count,
    maxCapacity: event.max_capacity
  };

  const calendarUrls = generateCalendarUrls(calendarEvent);

  const handleCalendarAction = (provider: string, url: string) => {
    window.open(url, '_blank', 'width=600,height=600');
    setIsAdded(true);
    
    toast({
      title: 'Opening calendar...',
      description: `Redirecting to ${provider} calendar to add this event.`,
    });

    // Reset the "added" state after a few seconds
    setTimeout(() => setIsAdded(false), 3000);
  };

  const handleDownloadICS = () => {
    try {
      downloadICSFile(calendarEvent);
      setIsAdded(true);
      
      toast({
        title: 'Calendar file downloaded',
        description: 'The event has been saved as an ICS file. Open it with your calendar app.',
      });

      setTimeout(() => setIsAdded(false), 3000);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Could not download the calendar file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatDateRange = () => {
    const start = new Date(event.starts_at);
    const end = event.ends_at ? new Date(event.ends_at) : null;
    
    const startStr = start.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    if (end && start.toDateString() === end.toDateString()) {
      const endStr = end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      return `${startStr} - ${endStr}`;
    }
    
    return startStr;
  };

  if (isAdded) {
    return (
      <Button 
        variant="outline" 
        size={size}
        className={`${className} text-green-600 border-green-200 bg-green-50 hover:bg-green-100`}
        disabled
      >
        <Check className="w-4 h-4 mr-2" />
        Added to Calendar
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Calendar className="w-4 h-4 mr-2" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        {/* Event Preview */}
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm line-clamp-1 mb-1">
            {event.title}
          </h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatDateRange()}
          </div>
          {(event.location || event.is_virtual) && (
            <p className="text-xs text-muted-foreground mt-1">
              {event.is_virtual ? 'Virtual Event' : event.location}
            </p>
          )}
        </div>

        {/* Calendar Options */}
        <div className="py-1">
          <DropdownMenuItem 
            onClick={() => handleCalendarAction('Google Calendar', calendarUrls.google)}
            className="cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Google Calendar</div>
              <div className="text-xs text-muted-foreground">Add to Google Calendar</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => handleCalendarAction('Outlook', calendarUrls.outlook)}
            className="cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Outlook.com</div>
              <div className="text-xs text-muted-foreground">Add to Outlook online</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => handleCalendarAction('Office 365', calendarUrls.office365)}
            className="cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Office 365</div>
              <div className="text-xs text-muted-foreground">Add to Office 365 calendar</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => handleCalendarAction('Yahoo Calendar', calendarUrls.yahoo)}
            className="cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Yahoo Calendar</div>
              <div className="text-xs text-muted-foreground">Add to Yahoo calendar</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {supportsICSDownload() && (
            <DropdownMenuItem 
              onClick={handleDownloadICS}
              className="cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              <div>
                <div className="font-medium">Download ICS File</div>
                <div className="text-xs text-muted-foreground">For Apple Calendar, Thunderbird, etc.</div>
              </div>
            </DropdownMenuItem>
          )}
        </div>

        {/* Instructions */}
        <div className="p-3 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground">
            Choose your calendar app to add this event. Some apps may require you to confirm the addition.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for smaller spaces
export function AddToCalendarCompact({ 
  event, 
  className = '' 
}: { 
  event: AddToCalendarProps['event']; 
  className?: string; 
}) {
  return (
    <AddToCalendar 
      event={event} 
      variant="outline" 
      size="sm"
      className={className}
    />
  );
}

// Quick add button that goes directly to Google Calendar
export function QuickAddToCalendar({ 
  event, 
  className = '' 
}: { 
  event: AddToCalendarProps['event']; 
  className?: string; 
}) {
  const { toast } = useToast();

  const handleQuickAdd = () => {
    const calendarEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      start: new Date(event.starts_at),
      end: event.ends_at ? new Date(event.ends_at) : undefined,
      location: event.location,
      isVirtual: event.is_virtual,
      organizer: event.host_name ? { name: event.host_name } : undefined,
    };

    const url = generateCalendarUrls(calendarEvent).google;
    window.open(url, '_blank', 'width=600,height=600');
    
    toast({
      title: 'Opening Google Calendar',
      description: 'Adding event to your Google Calendar...',
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleQuickAdd}
      className={`${className} text-muted-foreground hover:text-foreground`}
    >
      <Plus className="w-4 h-4 mr-1" />
      Add to Calendar
    </Button>
  );
}