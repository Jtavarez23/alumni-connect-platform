// Centralized rate limiting service for Alumni Connect
// Provides configurable rate limits for different actions and user types

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RateLimitConfig {
  key: string;
  maxRequests: number;
  timeWindow: number; // in milliseconds
  message?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  resetTime?: number;
  message?: string;
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // Messaging
  MESSAGES: {
    key: 'messages',
    maxRequests: 10,
    timeWindow: 60000, // 1 minute
    message: 'Message rate limit exceeded. Please wait a moment.'
  },
  
  // Claims
  CLAIMS: {
    key: 'claims',
    maxRequests: 5,
    timeWindow: 3600000, // 1 hour
    message: 'Claim submission limit exceeded. Please try again later.'
  },
  
  // Reports
  REPORTS: {
    key: 'reports',
    maxRequests: 10,
    timeWindow: 3600000, // 1 hour
    message: 'Report submission limit exceeded. Please try again later.'
  },
  
  // Likes
  LIKES: {
    key: 'likes',
    maxRequests: 30,
    timeWindow: 60000, // 1 minute
    message: 'Like action limit exceeded. Please wait a moment.'
  },
  
  // Comments
  COMMENTS: {
    key: 'comments',
    maxRequests: 15,
    timeWindow: 60000, // 1 minute
    message: 'Comment submission limit exceeded. Please wait a moment.'
  },
  
  // Uploads
  UPLOADS: {
    key: 'uploads',
    maxRequests: 5,
    timeWindow: 300000, // 5 minutes
    message: 'Upload limit exceeded. Please wait before uploading more files.'
  },
  
  // Friend requests
  FRIEND_REQUESTS: {
    key: 'friend_requests',
    maxRequests: 10,
    timeWindow: 3600000, // 1 hour
    message: 'Friend request limit exceeded. Please try again later.'
  }
} as const;

type RateLimitKey = keyof typeof RATE_LIMITS;

// Client-side rate limiting using localStorage (for immediate UI feedback)
export class ClientRateLimiter {
  static checkLimit(config: RateLimitConfig, userId: string): RateLimitResult {
    const storageKey = `rate_limit:${config.key}:${userId}`;
    const now = Date.now();
    
    try {
      const storedData = localStorage.getItem(storageKey);
      let data: { count: number; startTime: number };
      
      if (storedData) {
        data = JSON.parse(storedData);
        
        // Check if time window has expired
        if (now - data.startTime > config.timeWindow) {
          // Reset counter
          data = { count: 1, startTime: now };
        } else {
          // Increment counter
          data.count++;
        }
      } else {
        // Initialize new counter
        data = { count: 1, startTime: now };
      }
      
      // Save updated data
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      const remaining = Math.max(0, config.maxRequests - data.count);
      const resetTime = data.startTime + config.timeWindow;
      
      return {
        allowed: data.count <= config.maxRequests,
        remaining,
        resetTime,
        message: data.count > config.maxRequests ? config.message : undefined
      };
      
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow the action if rate limiting fails
      return { allowed: true };
    }
  }
  
  static clearLimit(config: RateLimitConfig, userId: string): void {
    const storageKey = `rate_limit:${config.key}:${userId}`;
    localStorage.removeItem(storageKey);
  }
  
  static getRemaining(config: RateLimitConfig, userId: string): number {
    const storageKey = `rate_limit:${config.key}:${userId}`;
    const storedData = localStorage.getItem(storageKey);
    
    if (!storedData) return config.maxRequests;
    
    try {
      const data = JSON.parse(storedData);
      const now = Date.now();
      
      if (now - data.startTime > config.timeWindow) {
        return config.maxRequests;
      }
      
      return Math.max(0, config.maxRequests - data.count);
    } catch {
      return config.maxRequests;
    }
  }
}

// Server-side rate limiting using Supabase RPC
export class ServerRateLimiter {
  static async checkLimit(config: RateLimitConfig, userId: string): Promise<RateLimitResult> {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_user_id: userId,
        p_action_key: config.key,
        p_max_requests: config.maxRequests,
        p_time_window: config.timeWindow
      });
      
      if (error) {
        console.error('Server rate limit check failed:', error);
        // Fall back to client-side rate limiting
        return ClientRateLimiter.checkLimit(config, userId);
      }
      
      return {
        allowed: data.allowed,
        remaining: data.remaining,
        resetTime: data.reset_time,
        message: data.allowed ? undefined : config.message
      };
      
    } catch (error) {
      console.error('Server rate limit check failed:', error);
      return ClientRateLimiter.checkLimit(config, userId);
    }
  }
}

// React hook for rate limiting
export function useRateLimit() {
  const { user } = useAuth();
  
  const checkRateLimit = async (limitKey: RateLimitKey): Promise<RateLimitResult> => {
    if (!user) {
      return { allowed: false, message: 'Authentication required' };
    }
    
    const config = RATE_LIMITS[limitKey];
    
    // Use server-side rate limiting when available, fall back to client-side
    try {
      return await ServerRateLimiter.checkLimit(config, user.id);
    } catch {
      return ClientRateLimiter.checkLimit(config, user.id);
    }
  };
  
  const clearRateLimit = (limitKey: RateLimitKey) => {
    if (user) {
      ClientRateLimiter.clearLimit(RATE_LIMITS[limitKey], user.id);
    }
  };
  
  const getRemaining = (limitKey: RateLimitKey): number => {
    if (!user) return 0;
    return ClientRateLimiter.getRemaining(RATE_LIMITS[limitKey], user.id);
  };
  
  return {
    checkRateLimit,
    clearRateLimit,
    getRemaining
  };
}

// Utility function for common rate limit checks
export async function withRateLimit(
  limitKey: RateLimitKey,
  action: () => Promise<void>,
  onLimitExceeded?: (result: RateLimitResult) => void
): Promise<boolean> {
  const { checkRateLimit } = useRateLimit();
  const result = await checkRateLimit(limitKey);
  
  if (!result.allowed) {
    onLimitExceeded?.(result);
    return false;
  }
  
  try {
    await action();
    return true;
  } catch (error) {
    console.error('Action failed after rate limit check:', error);
    return false;
  }
}