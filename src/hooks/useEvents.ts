// Events System Hooks
// React Query hooks for Events CRUD and management

import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  Event, 
  EventFilters, 
  EventsResponse,
  CreateEventPayload,
  EventAttendee 
} from '@/types/events';

// =============================================
// QUERY HOOKS
// =============================================

export function useEvents(filters: EventFilters = {}, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['events', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('search_events', {
        p_limit: limit,
        p_offset: pageParam * limit,
        p_school_id: filters.school_id || null,
        p_start_date: filters.start_date || null,
        p_end_date: filters.end_date || null,
        p_location: filters.location || null,
        p_is_virtual: filters.is_virtual || null,
        p_search_query: filters.search || null
      });

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      return data as EventsResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.has_more ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_event_details', {
        p_event_id: eventId
      });

      if (error) {
        console.error('Error fetching event:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as { event: Event; tickets: any[]; sample_attendees: any[] };
    },
    enabled: !!eventId,
  });
}

export function useEventAttendees(eventId: string) {
  return useQuery({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          user:profiles!user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });

      if (error) {
        console.error('Error fetching event attendees:', error);
        throw error;
      }

      return data.map(attendee => ({
        ...attendee,
        display_name: attendee.user?.display_name,
        avatar_url: attendee.user?.avatar_url
      })) as EventAttendee[];
    },
    enabled: !!eventId,
  });
}

export function useUserEvents(userId?: string) {
  return useQuery({
    queryKey: ['user-events', userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      // Get events created by user
      const { data: createdEvents, error: createdError } = await supabase
        .from('events')
        .select('*, tickets:event_tickets(*)')
        .eq('created_by', targetUserId)
        .order('starts_at', { ascending: false });

      if (createdError) throw createdError;

      // Get events user is attending
      const { data: attendingEvents, error: attendingError } = await supabase
        .from('event_attendees')
        .select(`
          *,
          event:events (
            *,
            tickets:event_tickets(*)
          )
        `)
        .eq('user_id', targetUserId)
        .eq('status', 'registered');

      if (attendingError) throw attendingError;

      return {
        created: createdEvents || [],
        attending: attendingEvents?.map(a => a.event).filter(Boolean) || []
      };
    },
    enabled: true,
  });
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: CreateEventPayload) => {
      const { data, error } = await supabase.rpc('create_event', {
        p_title: eventData.title,
        p_description: eventData.description,
        p_starts_at: eventData.starts_at,
        p_ends_at: eventData.ends_at,
        p_location: eventData.location,
        p_is_virtual: eventData.is_virtual || false,
        p_visibility: eventData.visibility || 'alumni_only',
        p_host_type: eventData.host_type || 'user',
        p_host_id: eventData.host_id,
        p_max_capacity: eventData.max_capacity,
        p_tickets: eventData.tickets ? JSON.stringify(eventData.tickets) : '[]'
      });

      if (error) {
        console.error('Error creating event:', error);
        throw error;
      }

      return data as Event;
    },
    onSuccess: (newEvent) => {
      // Invalidate and refetch events
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      
      // Add to cache
      queryClient.setQueryData(['event', newEvent.id], newEvent);
      
      toast.success('Event created successfully!');
    },
    onError: (error: any) => {
      console.error('Create event error:', error);
      toast.error(error.message || 'Failed to create event');
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<Event> }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
        throw error;
      }

      return data as Event;
    },
    onSuccess: (updatedEvent) => {
      // Update cache
      queryClient.setQueryData(['event', updatedEvent.id], updatedEvent);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      
      toast.success('Event updated successfully!');
    },
    onError: (error: any) => {
      console.error('Update event error:', error);
      toast.error(error.message || 'Failed to update event');
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        throw error;
      }

      return eventId;
    },
    onSuccess: (eventId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      
      toast.success('Event deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete event error:', error);
      toast.error(error.message || 'Failed to delete event');
    },
  });
}

export function useRSVPEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, register = true }: { eventId: string; register?: boolean }) => {
      const { data, error } = await supabase.rpc('rsvp_to_event', {
        p_event_id: eventId,
        p_action: register ? 'register' : 'unregister'
      });

      if (error) {
        console.error('Error with RSVP:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (result, { eventId, register }) => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      
      toast.success(result.message || (register ? 'Successfully registered for event!' : 'RSVP removed'));
    },
    onError: (error: any) => {
      console.error('RSVP error:', error);
      toast.error(error.message || 'Failed to update RSVP');
    },
  });
}

// =============================================
// UTILITY HOOKS
// =============================================

export function useEventSearch(query: string) {
  return useQuery({
    queryKey: ['events-search', query],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .textSearch('search', query)
        .gt('starts_at', new Date().toISOString())
        .limit(10);

      if (error) {
        console.error('Error searching events:', error);
        throw error;
      }

      return data as Event[];
    },
    enabled: query.length > 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCalendarEvents(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['calendar-events', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, starts_at, ends_at, location, is_virtual, max_capacity')
        .gte('starts_at', startDate.toISOString())
        .lte('starts_at', endDate.toISOString())
        .order('starts_at');

      if (error) {
        console.error('Error fetching calendar events:', error);
        throw error;
      }

      return data.map(event => ({
        ...event,
        start: new Date(event.starts_at),
        end: event.ends_at ? new Date(event.ends_at) : undefined
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}