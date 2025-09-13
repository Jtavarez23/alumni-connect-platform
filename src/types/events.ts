// Events System Types
// Based on AC-ARCH-004 component contracts

export type EventRole = 'host' | 'cohost' | 'organizer' | 'moderator';
export type OrderStatus = 'created' | 'paid' | 'refunded' | 'canceled';
export type AttendeeStatus = 'registered' | 'attended' | 'no_show';
export type Visibility = 'public' | 'alumni_only' | 'school_only' | 'connections_only' | 'private';

export interface EventTicket {
  id: string;
  event_id: string;
  name: string;
  price_cents: number;
  currency: string;
  quantity?: number;
  quantity_sold: number;
  sales_start?: string;
  sales_end?: string;
  created_at: string;
}

export interface EventOrder {
  id: string;
  event_id: string;
  purchaser_id?: string;
  ticket_id?: string;
  qty: number;
  total_cents: number;
  currency: string;
  stripe_payment_intent?: string;
  status: OrderStatus;
  attendee_emails?: string[];
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  order_id?: string;
  status: AttendeeStatus;
  registered_at: string;
  // Populated data
  display_name?: string;
  avatar_url?: string;
}

export interface Event {
  id: string;
  host_type: 'school' | 'group' | 'user';
  host_id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at?: string;
  location?: string;
  is_virtual: boolean;
  visibility: Visibility;
  ticketing_enabled: boolean;
  max_capacity?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Populated data
  host_name?: string;
  host_avatar?: string;
  school_name?: string;
  tickets?: EventTicket[];
  attendee_count: number;
  is_attending?: boolean;
  user_ticket?: EventTicket;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  starts_at: string;
  ends_at?: string;
  location?: string;
  is_virtual?: boolean;
  visibility?: Visibility;
  host_type?: string;
  host_id?: string;
  max_capacity?: number;
  tickets?: Partial<EventTicket>[];
}

export interface EventFilters {
  school_id?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  is_virtual?: boolean;
  search?: string;
}

export interface EventsResponse {
  events: Event[];
  total_count: number;
  has_more: boolean;
}

// Calendar view types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  location?: string;
  is_virtual: boolean;
  attendee_count: number;
  max_capacity?: number;
}

// Event creation wizard steps
export interface EventWizardStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
}

export interface EventCreationData {
  // Step 1: Basic Info
  title: string;
  description: string;
  
  // Step 2: Date & Time
  starts_at: Date | null;
  ends_at: Date | null;
  timezone: string;
  
  // Step 3: Location
  location: string;
  is_virtual: boolean;
  virtual_link?: string;
  
  // Step 4: Tickets (optional)
  ticketing_enabled: boolean;
  tickets: Partial<EventTicket>[];
  
  // Step 5: Settings
  visibility: Visibility;
  max_capacity?: number;
  host_type: 'school' | 'group' | 'user';
  host_id?: string;
}