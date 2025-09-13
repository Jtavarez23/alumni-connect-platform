/**
 * Yearbooks Tab Screen
 * Browse and discover yearbooks from schools
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/react-query';
import type { Yearbook } from '../../types';

export default function YearbooksScreen() {
  const router = useRouter();

  // Fetch yearbooks data
  const {
    data: yearbooks,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.yearbooks(),
    queryFn: async (): Promise<Yearbook[]> => {
      const { data, error } = await supabase
        .from('yearbooks')
        .select(`
          *,
          schools!inner (
            name,
            logo_url
          )
        `)
        .eq('upload_status', 'completed')
        .order('year', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleYearbookPress = (yearbook: Yearbook) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/yearbook/${yearbook.id}`);
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  const renderYearbookCard = (yearbook: Yearbook) => (
    <TouchableOpacity
      key={yearbook.id}
      style={styles.yearbookCard}
      onPress={() => handleYearbookPress(yearbook)}
      activeOpacity={0.7}
    >
      <View style={styles.yearbookImageContainer}>
        {yearbook.cover_image_url ? (
          <Image
            source={{ uri: yearbook.cover_image_url }}
            style={styles.yearbookImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.yearbookImagePlaceholder}>
            <Text style={styles.yearbookImagePlaceholderText}>📚</Text>
          </View>
        )}
        <View style={styles.yearbookOverlay}>
          <Text style={styles.yearbookYear}>{yearbook.year}</Text>
        </View>
      </View>
      
      <View style={styles.yearbookInfo}>
        <Text style={styles.yearbookTitle} numberOfLines={2}>
          {yearbook.title}
        </Text>
        <Text style={styles.yearbookSchool} numberOfLines={1}>
          {(yearbook as any).schools?.name}
        </Text>
        <Text style={styles.yearbookPages}>
          {yearbook.total_pages} pages
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yearbooks</Text>
        <Text style={styles.headerSubtitle}>
          Discover memories from your school years
        </Text>
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
        {isLoading && !yearbooks && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading yearbooks...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Failed to load yearbooks. Pull to retry.
            </Text>
          </View>
        )}

        {yearbooks && yearbooks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No Yearbooks Yet</Text>
            <Text style={styles.emptyDescription}>
              Yearbooks will appear here once they&apos;re uploaded and processed.
            </Text>
          </View>
        )}

        {yearbooks && yearbooks.length > 0 && (
          <View style={styles.yearbooksGrid}>
            {yearbooks.map(renderYearbookCard)}
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
  yearbooksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  yearbookCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  yearbookImageContainer: {
    position: 'relative',
    height: 160,
  },
  yearbookImage: {
    width: '100%',
    height: '100%',
  },
  yearbookImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearbookImagePlaceholderText: {
    fontSize: 32,
  },
  yearbookOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  yearbookYear: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  yearbookInfo: {
    padding: 12,
  },
  yearbookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  yearbookSchool: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  yearbookPages: {
    fontSize: 12,
    color: '#94A3B8',
  },
});