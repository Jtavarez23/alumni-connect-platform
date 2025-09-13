// Calendar Integration Utilities
// Generate ICS calendar files and handle calendar operations

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  location?: string;
  isVirtual?: boolean;
  virtualUrl?: string;
  organizer?: {
    name: string;
    email?: string;
  };
  attendeeCount?: number;
  maxCapacity?: number;
}

// Generate ICS calendar file content
export function generateICSFile(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    // Convert to UTC and format as YYYYMMDDTHHMMSSZ
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  };

  const now = new Date();
  const startDate = event.start;
  const endDate = event.end || new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration

  let description = event.description ? escapeText(event.description) : '';
  
  // Add event details to description
  if (event.isVirtual && event.virtualUrl) {
    description += `\\n\\nJoin virtually: ${event.virtualUrl}`;
  }
  
  if (event.attendeeCount) {
    description += `\\n\\nAttendees: ${event.attendeeCount}`;
    if (event.maxCapacity) {
      description += ` / ${event.maxCapacity}`;
    }
  }

  let location = '';
  if (event.isVirtual) {
    location = event.virtualUrl || 'Virtual Event';
  } else {
    location = event.location || '';
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alumni Connect//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@alumni-connect.com`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(description ? [`DESCRIPTION:${description}`] : []),
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    ...(event.organizer ? [`ORGANIZER;CN=${escapeText(event.organizer.name)}${event.organizer.email ? `:MAILTO:${event.organizer.email}` : ''}`] : []),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

// Download ICS file
export function downloadICSFile(event: CalendarEvent): void {
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Generate calendar URLs for different providers
export function generateCalendarUrls(event: CalendarEvent) {
  const startDate = event.start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
  const endDate = (event.end || new Date(event.start.getTime() + 60 * 60 * 1000))
    .toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
  
  const title = encodeURIComponent(event.title);
  const description = encodeURIComponent(event.description || '');
  const location = encodeURIComponent(event.isVirtual ? 'Virtual Event' : event.location || '');

  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${description}&location=${location}`,
    
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate}&enddt=${endDate}&body=${description}&location=${location}`,
    
    yahoo: `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${title}&st=${startDate}&et=${endDate}&desc=${description}&in_loc=${location}`,
    
    // For Outlook desktop (office365)
    office365: `https://outlook.office.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate}&enddt=${endDate}&body=${description}&location=${location}`
  };
}

// Generate a universal add-to-calendar URL that works across platforms
export function generateAddToCalendarUrl(event: CalendarEvent): string {
  // Use Google Calendar as the universal option since it works on most devices
  return generateCalendarUrls(event).google;
}

// Check if the browser supports downloading ICS files
export function supportsICSDownload(): boolean {
  return typeof window !== 'undefined' && 'Blob' in window && 'URL' in window;
}

// Generate reminder timestamps (24h, 1h, 15min before event)
export function generateReminderTimes(eventStart: Date): Date[] {
  const reminders: Date[] = [];
  const eventTime = eventStart.getTime();
  
  // 24 hours before
  const oneDayBefore = new Date(eventTime - 24 * 60 * 60 * 1000);
  if (oneDayBefore > new Date()) {
    reminders.push(oneDayBefore);
  }
  
  // 1 hour before
  const oneHourBefore = new Date(eventTime - 60 * 60 * 1000);
  if (oneHourBefore > new Date()) {
    reminders.push(oneHourBefore);
  }
  
  // 15 minutes before
  const fifteenMinBefore = new Date(eventTime - 15 * 60 * 1000);
  if (fifteenMinBefore > new Date()) {
    reminders.push(fifteenMinBefore);
  }
  
  return reminders;
}

// Format event time for display
export function formatEventTime(start: Date, end?: Date, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  const startStr = start.toLocaleDateString('en-US', options);
  
  if (end) {
    const endOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    // If same day, just show end time
    if (start.toDateString() === end.toDateString()) {
      const endStr = end.toLocaleDateString('en-US', endOptions);
      return `${startStr} - ${endStr}`;
    } else {
      // Different days, show full end date
      const endStr = end.toLocaleDateString('en-US', options);
      return `${startStr} - ${endStr}`;
    }
  }
  
  return startStr;
}