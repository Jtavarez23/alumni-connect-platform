/**
 * Network Tab Screen
 * Connect with alumni and classmates
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/react-query';
import type { Profile } from '../../types';

export default function NetworkScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');

  // Fetch network connections
  const {
    data: connections,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.network(),
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const handleProfilePress = (profile: Profile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/profile/${profile.id}` as any);
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  const filteredConnections = connections?.filter(profile =>
    searchQuery === '' ||
    `${profile.first_name} ${profile.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderConnectionCard = (profile: Profile) => (
    <TouchableOpacity
      key={profile.id}
      style={styles.connectionCard}
      onPress={() => handleProfilePress(profile)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {profile.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {profile.first_name?.[0] || profile.email[0]}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.connectionInfo}>
        <Text style={styles.connectionName}>
          {profile.first_name && profile.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile.email
          }
        </Text>
        {profile.bio && (
          <Text style={styles.connectionBio} numberOfLines={2}>
            {profile.bio}
          </Text>
        )}
        <Text style={styles.connectionEmail}>{profile.email}</Text>
      </View>

      <TouchableOpacity
        style={styles.connectButton}
        onPress={(e) => {
          e.stopPropagation();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Handle connect action
        }}
      >
        <Text style={styles.connectButtonText}>Connect</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Network</Text>
        <Text style={styles.headerSubtitle}>
          Connect with fellow alumni
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search alumni..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
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
        {isLoading && !connections && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Finding your network...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Failed to load network. Pull to retry.
            </Text>
          </View>
        )}

        {filteredConnections && filteredConnections.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Results Found' : 'Growing Network'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? `No alumni found matching "${searchQuery}"`
                : 'Your network will appear here as more alumni join.'
              }
            </Text>
          </View>
        )}

        {filteredConnections && filteredConnections.length > 0 && (
          <View style={styles.connectionsContainer}>
            <Text style={styles.sectionTitle}>
              {searchQuery
                ? `${filteredConnections.length} results for "${searchQuery}"`
                : `${filteredConnections.length} alumni to connect with`
              }
            </Text>
            {filteredConnections.map(renderConnectionCard)}
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInput: {
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  connectionsContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 16,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  connectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  connectionBio: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
    lineHeight: 18,
  },
  connectionEmail: {
    fontSize: 12,
    color: '#94A3B8',
  },
  connectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});