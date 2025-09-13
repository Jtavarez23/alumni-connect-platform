/**
 * Events Tab Screen
 * Discover and manage alumni events and reunions
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/react-query';
import type { Event } from '../../types';

export default function EventsScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = React.useState<'upcoming' | 'my-events'>('upcoming');

  // Fetch upcoming events
  const {
    data: upcomingEvents,
    isLoading: isLoadingUpcoming,
    error: errorUpcoming,
    refetch: refetchUpcoming,
    isRefetching: isRefetchingUpcoming,
  } = useQuery({
    queryKey: [...queryKeys.events(), 'upcoming'],
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: selectedTab === 'upcoming',
  });

  // Fetch user's events
  const {
    data: myEvents,
    isLoading: isLoadingMy,
    error: errorMy,
    refetch: refetchMy,
    isRefetching: isRefetchingMy,
  } = useQuery({
    queryKey: [...queryKeys.events(), 'user'],
    queryFn: async (): Promise<Event[]> => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return [];

      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          *,
          events!inner (*)
        `)
        .eq('user_id', user.data.user.id)
        .order('events.start_date', { ascending: true });

      if (error) throw error;
      return data?.map(attendee => (attendee as any).events) || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: selectedTab === 'my-events',
  });

  const handleEventPress = (event: Event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/event/${event.id}` as any);
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedTab === 'upcoming') {
      refetchUpcoming();
    } else {
      refetchMy();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderEventCard = (event: Event) => (
    <TouchableOpacity
      key={event.id}
      style={styles.eventCard}
      onPress={() => handleEventPress(event)}
      activeOpacity={0.7}
    >
      <View style={styles.eventDateContainer}>
        <Text style={styles.eventDate}>{formatDate(event.start_date)}</Text>
        <Text style={styles.eventTime}>{formatTime(event.start_date)}</Text>
      </View>
      
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>
        {event.location && (
          <Text style={styles.eventLocation} numberOfLines={1}>
            📍 {event.location}
          </Text>
        )}
        {event.is_virtual && (
          <Text style={styles.eventVirtual}>🌐 Virtual Event</Text>
        )}
        {event.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        )}
        
        <View style={styles.eventMetadata}>
          {event.is_paid && (
            <Text style={styles.eventPaid}>💳 Paid</Text>
          )}
          {event.max_attendees && (
            <Text style={styles.eventCapacity}>
              👥 {event.attendee_count || 0}/{event.max_attendees}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.eventActions}>
        <Text style={styles.eventRsvp}>
          {event.user_rsvp || 'No RSVP'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const currentEvents = selectedTab === 'upcoming' ? upcomingEvents : myEvents;
  const isLoading = selectedTab === 'upcoming' ? isLoadingUpcoming : isLoadingMy;
  const error = selectedTab === 'upcoming' ? errorUpcoming : errorMy;
  const isRefetching = selectedTab === 'upcoming' ? isRefetchingUpcoming : isRefetchingMy;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        <Text style={styles.headerSubtitle}>
          Connect at reunions and gatherings
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'upcoming' && styles.activeTab,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedTab('upcoming');
          }}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'upcoming' && styles.activeTabText,
            ]}
          >
            Upcoming Events
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'my-events' && styles.activeTab,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedTab('my-events');
          }}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'my-events' && styles.activeTabText,
            ]}
          >
            My Events
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor="#0F172A"
            colors={['#0F172A']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !currentEvents && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Failed to load events. Pull to retry.
            </Text>
          </View>
        )}

        {currentEvents && currentEvents.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>
              {selectedTab === 'upcoming' ? 'No Upcoming Events' : 'No Events Yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {selectedTab === 'upcoming'
                ? 'Check back soon for alumni events and reunions.'
                : 'Events you RSVP to will appear here.'
              }
            </Text>
          </View>
        )}

        {currentEvents && currentEvents.length > 0 && (
          <View style={styles.eventsContainer}>
            {currentEvents.map(renderEventCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    margin: 20,
    marginBottom: 0,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  eventsContainer: {
    gap: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  eventDateContainer: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 4,
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  eventTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 22,
  },
  eventLocation: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  eventVirtual: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 18,
  },
  eventMetadata: {
    flexDirection: 'row',
    gap: 12,
  },
  eventPaid: {
    fontSize: 12,
    color: '#F59E0B',
  },
  eventCapacity: {
    fontSize: 12,
    color: '#64748B',
  },
  eventActions: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  eventRsvp: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
});