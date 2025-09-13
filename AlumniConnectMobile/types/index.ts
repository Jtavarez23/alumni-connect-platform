/**
 * Shared TypeScript Types for Alumni Connect Mobile
 * Synchronized with web app types for consistency
 */

// Re-export database types from Supabase
export type { Database } from '../lib/supabase';

/**
 * User Profile Types
 */
export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserEducation {
  id: string;
  user_id: string;
  school_name: string;
  graduation_year: number;
  degree_type?: string;
  major?: string;
  created_at: string;
}

/**
 * Yearbook Types
 */
export interface Yearbook {
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
}

export interface YearbookPage {
  id: string;
  yearbook_id: string;
  page_number: number;
  image_url: string;
  deep_zoom_url: string | null;
  ocr_text: string | null;
  created_at: string;
}

/**
 * Social Feed Types
 */
export interface Post {
  id: string;
  content: string;
  image_url: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
  comments_count?: number;
  reactions_count?: number;
  user_reaction?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  post_id: string;
  author_id: string;
  created_at: string;
  author?: Profile;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

/**
 * Event Types
 */
export interface Event {
  id: string;
  host_type: 'school' | 'group' | 'user';
  host_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  venue_name: string | null;
  is_virtual: boolean;
  max_attendees: number | null;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  attendee_count?: number;
  user_rsvp?: string | null;
}

/**
 * Message Types
 */
export interface MessageThread {
  id: string;
  participant_ids: string[];
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  participants?: Profile[];
  unread_count?: number;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
  is_read: boolean;
}

/**
 * Business Directory Types
 */
export interface Business {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

/**
 * Premium Features Types
 */
export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  is_popular: boolean;
  max_premium_groups?: number;
  max_monthly_events?: number;
}

export interface UserSubscription {
  id: string;
  tier_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
  tier: SubscriptionTier;
}

export interface AlumniPerk {
  id: string;
  title: string;
  description: string;
  perk_type: 'discount' | 'free_item' | 'exclusive_access';
  value_type: 'percentage' | 'fixed_amount' | 'free';
  discount_value: number | null;
  currency: string;
  redemption_code: string | null;
  redemption_url: string | null;
  terms_conditions: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_featured: boolean;
  already_redeemed: boolean;
  business: {
    name: string;
    logo_url: string | null;
    category: string;
  };
}

/**
 * Navigation Types
 */
export interface NavigationRoute {
  name: string;
  title: string;
  icon: string;
  component: string;
  params?: Record<string, any>;
}

/**
 * Mobile-specific Types
 */
export interface TouchGesture {
  type: 'tap' | 'double_tap' | 'pinch' | 'pan' | 'long_press';
  coordinates?: { x: number; y: number };
  scale?: number;
  velocity?: { x: number; y: number };
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
}

export interface CameraResult {
  uri: string;
  width: number;
  height: number;
  type: 'image' | 'video';
  duration?: number;
}

/**
 * API Response Types
 */
export interface APIResponse<T> {
  data: T;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

/**
 * Error Types
 */
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Utility Types
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Export commonly used type utilities
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type NonNullable<T> = T extends null | undefined ? never : T;