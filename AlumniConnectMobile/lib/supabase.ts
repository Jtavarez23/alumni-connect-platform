/**
 * Supabase Client Configuration for Alumni Connect Mobile
 * Shared authentication and data layer between web and mobile apps
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Use the same Supabase configuration as web app
const SUPABASE_URL = 'https://dyhloaxsdcfgfyfhrdfc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aGxvYXhzZGNmZ2Z5ZmhyZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTMwNTIsImV4cCI6MjA3MTg4OTA1Mn0.eg_bc94ySXthS_A8_oIffrrsW4UcSSu5lEKOw89OIz0';

/**
 * Enhanced Cross-Platform Storage for React Native with secure token storage
 * Handles web compatibility gracefully for Google-level reliability
 */
class SupabaseStorage {
  private isWeb = typeof window !== 'undefined';

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isWeb) {
        // Web fallback using localStorage
        return localStorage.getItem(key);
      }

      // Use SecureStore for sensitive auth tokens on mobile
      if (key.includes('access-token') || key.includes('refresh-token')) {
        return await SecureStore.getItemAsync(key);
      }
      // Use AsyncStorage for other data on mobile
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('SupabaseStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isWeb) {
        // Web fallback using localStorage
        localStorage.setItem(key, value);
        return;
      }

      // Use SecureStore for sensitive auth tokens on mobile
      if (key.includes('access-token') || key.includes('refresh-token')) {
        await SecureStore.setItemAsync(key, value);
      } else {
        // Use AsyncStorage for other data on mobile
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('SupabaseStorage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isWeb) {
        // Web fallback using localStorage
        localStorage.removeItem(key);
        return;
      }

      // Try both storage methods on mobile
      if (key.includes('access-token') || key.includes('refresh-token')) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('SupabaseStorage removeItem error:', error);
    }
  }
}

/**
 * Supabase client configured for React Native with enhanced security
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: new SupabaseStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native
  },
  realtime: {
    params: {
      eventsPerSecond: 2, // Optimize for mobile bandwidth
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'alumni-connect-mobile',
    },
  },
});

/**
 * Database types - sync with web app types
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
        };
        Update: {
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          updated_at?: string;
        };
      };
      yearbooks: {
        Row: {
          id: string;
          title: string;
          year: number;
          school_id: string;
          cover_image_url: string | null;
          total_pages: number;
          upload_status: 'processing' | 'completed' | 'failed';
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
      };
      posts: {
        Row: {
          id: string;
          content: string;
          image_url: string | null;
          author_id: string;
          created_at: string;
          updated_at: string;
        };
      };
      // Add more table types as needed...
    };
  };
};

// Re-export for convenience
export default supabase;