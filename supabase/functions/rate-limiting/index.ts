// ================================================================
// ALUMNI CONNECT: RATE LIMITING SERVICE
// File: rate-limiting/index.ts
// Purpose: Centralized rate limiting for API endpoints and sensitive operations
// ================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

interface RateLimitRequest {
  action: 'check_limit' | 'increment_counter' | 'reset_limit' | 'get_status' | 'configure_limit';
  identifier: string; // IP address, user ID, or custom identifier
  limit_type: string;
  limit_config?: {
    max_requests: number;
    window_seconds: number;
    block_duration_seconds?: number;
    progressive_penalties?: boolean;
  };
  user_id?: string;
  endpoint?: string;
  metadata?: Record<string, any>;
}

interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  reset_time: string;
  blocked_until?: string;
  violation_count: number;
  current_window_start: string;
}

interface RateLimitConfig {
  limit_type: string;
  max_requests: number;
  window_seconds: number;
  block_duration_seconds: number;
  progressive_penalties: boolean;
  description: string;
  category: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Default rate limit configurations
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication limits
  login_attempts: {
    limit_type: 'login_attempts',
    max_requests: 5,
    window_seconds: 900, // 15 minutes
    block_duration_seconds: 3600, // 1 hour
    progressive_penalties: true,
    description: 'Login attempts per IP/user',
    category: 'authentication'
  },
  
  signup_attempts: {
    limit_type: 'signup_attempts',
    max_requests: 3,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 7200, // 2 hours
    progressive_penalties: false,
    description: 'Account creation attempts per IP',
    category: 'authentication'
  },
  
  password_reset: {
    limit_type: 'password_reset',
    max_requests: 3,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 1800, // 30 minutes
    progressive_penalties: false,
    description: 'Password reset requests',
    category: 'authentication'
  },
  
  mfa_attempts: {
    limit_type: 'mfa_attempts',
    max_requests: 10,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 1800, // 30 minutes
    progressive_penalties: true,
    description: 'MFA verification attempts',
    category: 'authentication'
  },
  
  // API endpoint limits
  api_general: {
    limit_type: 'api_general',
    max_requests: 1000,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 300, // 5 minutes
    progressive_penalties: false,
    description: 'General API requests per user',
    category: 'api'
  },
  
  api_search: {
    limit_type: 'api_search',
    max_requests: 100,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 600, // 10 minutes
    progressive_penalties: false,
    description: 'Search API requests per user',
    category: 'api'
  },
  
  api_upload: {
    limit_type: 'api_upload',
    max_requests: 50,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 1800, // 30 minutes
    progressive_penalties: false,
    description: 'File upload requests per user',
    category: 'api'
  },
  
  // Content creation limits
  post_creation: {
    limit_type: 'post_creation',
    max_requests: 20,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 1800, // 30 minutes
    progressive_penalties: false,
    description: 'Post creation per user',
    category: 'content'
  },
  
  comment_creation: {
    limit_type: 'comment_creation',
    max_requests: 50,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 900, // 15 minutes
    progressive_penalties: false,
    description: 'Comment creation per user',
    category: 'content'
  },
  
  message_sending: {
    limit_type: 'message_sending',
    max_requests: 100,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 1800, // 30 minutes
    progressive_penalties: false,
    description: 'Private message sending per user',
    category: 'content'
  },
  
  // Verification and claims
  claim_submission: {
    limit_type: 'claim_submission',
    max_requests: 10,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 3600, // 1 hour
    progressive_penalties: false,
    description: 'Yearbook claim submissions per user',
    category: 'verification'
  },
  
  verification_requests: {
    limit_type: 'verification_requests',
    max_requests: 5,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 7200, // 2 hours
    progressive_penalties: false,
    description: 'Email/SMS verification requests',
    category: 'verification'
  },
  
  // GDPR requests
  gdpr_export: {
    limit_type: 'gdpr_export',
    max_requests: 1,
    window_seconds: 86400, // 24 hours
    block_duration_seconds: 86400, // 24 hours
    progressive_penalties: false,
    description: 'GDPR data export requests per user',
    category: 'gdpr'
  },
  
  gdpr_deletion: {
    limit_type: 'gdpr_deletion',
    max_requests: 1,
    window_seconds: 604800, // 1 week
    block_duration_seconds: 604800, // 1 week
    progressive_penalties: false,
    description: 'GDPR data deletion requests per user',
    category: 'gdpr'
  },
  
  // Abuse prevention
  report_submission: {
    limit_type: 'report_submission',
    max_requests: 10,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 1800, // 30 minutes
    progressive_penalties: false,
    description: 'Content report submissions per user',
    category: 'moderation'
  },
  
  connection_requests: {
    limit_type: 'connection_requests',
    max_requests: 20,
    window_seconds: 3600, // 1 hour
    block_duration_seconds: 1800, // 30 minutes
    progressive_penalties: false,
    description: 'Connection requests per user',
    category: 'social'
  }
};

// Check rate limit for identifier and limit type
async function checkRateLimit(
  identifier: string,
  limitType: string,
  userId?: string,
  endpoint?: string,
  metadata?: Record<string, any>
): Promise<RateLimitStatus> {
  try {
    // Get rate limit configuration
    const config = DEFAULT_RATE_LIMITS[limitType];
    if (!config) {
      throw new Error(`Unknown rate limit type: ${limitType}`);
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - (config.window_seconds * 1000));

    // Check current rate limit status
    const { data: currentLimit, error: selectError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('limit_type', limitType)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw new Error(`Database error: ${selectError.message}`);
    }

    let requestCount = 0;
    let violationCount = 0;
    let blockedUntil: Date | null = null;
    let currentWindowStart = now;

    if (currentLimit) {
      requestCount = currentLimit.request_count;
      violationCount = currentLimit.violation_count || 0;
      currentWindowStart = new Date(currentLimit.window_start);
      
      if (currentLimit.blocked_until) {
        blockedUntil = new Date(currentLimit.blocked_until);
      }
    }

    // Check if currently blocked
    if (blockedUntil && blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        reset_time: new Date(currentWindowStart.getTime() + (config.window_seconds * 1000)).toISOString(),
        blocked_until: blockedUntil.toISOString(),
        violation_count: violationCount,
        current_window_start: currentWindowStart.toISOString()
      };
    }

    // Check if limit exceeded
    const allowed = requestCount < config.max_requests;
    const remaining = Math.max(0, config.max_requests - requestCount);
    const resetTime = new Date(currentWindowStart.getTime() + (config.window_seconds * 1000));

    return {
      allowed,
      remaining,
      reset_time: resetTime.toISOString(),
      blocked_until: blockedUntil?.toISOString(),
      violation_count: violationCount,
      current_window_start: currentWindowStart.toISOString()
    };

  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request but log error
    return {
      allowed: true,
      remaining: 999,
      reset_time: new Date(Date.now() + 3600000).toISOString(),
      violation_count: 0,
      current_window_start: new Date().toISOString()
    };
  }
}

// Increment rate limit counter
async function incrementRateLimit(
  identifier: string,
  limitType: string,
  userId?: string,
  endpoint?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; status: RateLimitStatus; blocked?: boolean }> {
  try {
    // Get rate limit configuration
    const config = DEFAULT_RATE_LIMITS[limitType];
    if (!config) {
      throw new Error(`Unknown rate limit type: ${limitType}`);
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - (config.window_seconds * 1000));

    // Get or create rate limit record
    let { data: rateLimitRecord, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('limit_type', limitType)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database error: ${error.message}`);
    }

    let requestCount = 1;
    let violationCount = 0;
    let currentWindowStart = now;
    let blockedUntil: Date | null = null;

    if (rateLimitRecord) {
      // Update existing record
      requestCount = rateLimitRecord.request_count + 1;
      violationCount = rateLimitRecord.violation_count || 0;
      currentWindowStart = new Date(rateLimitRecord.window_start);
      
      if (rateLimitRecord.blocked_until) {
        blockedUntil = new Date(rateLimitRecord.blocked_until);
      }

      // Check if this increment would exceed the limit
      if (requestCount > config.max_requests && (!blockedUntil || blockedUntil <= now)) {
        violationCount++;
        
        // Calculate block duration with progressive penalties
        let blockDuration = config.block_duration_seconds;
        if (config.progressive_penalties && violationCount > 1) {
          blockDuration = blockDuration * Math.pow(2, violationCount - 1); // Exponential backoff
        }
        
        blockedUntil = new Date(now.getTime() + (blockDuration * 1000));

        // Log security event
        await logSecurityEvent(identifier, limitType, {
          user_id: userId,
          endpoint,
          request_count: requestCount,
          violation_count: violationCount,
          blocked_until: blockedUntil.toISOString(),
          metadata
        });
      }

      // Update the record
      const { error: updateError } = await supabase
        .from('rate_limits')
        .update({
          request_count: requestCount,
          violation_count: violationCount,
          blocked_until: blockedUntil?.toISOString(),
          last_request_at: now.toISOString(),
          last_request_metadata: metadata || {}
        })
        .eq('id', rateLimitRecord.id);

      if (updateError) {
        throw new Error(`Update error: ${updateError.message}`);
      }

    } else {
      // Create new record for this window
      currentWindowStart = now;
      
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          identifier,
          limit_type: limitType,
          request_count: 1,
          violation_count: 0,
          window_start: currentWindowStart.toISOString(),
          last_request_at: now.toISOString(),
          last_request_metadata: metadata || {}
        });

      if (insertError) {
        throw new Error(`Insert error: ${insertError.message}`);
      }
    }

    // Return status
    const status = await checkRateLimit(identifier, limitType, userId, endpoint, metadata);
    
    return {
      success: true,
      status,
      blocked: blockedUntil !== null && blockedUntil > now
    };

  } catch (error) {
    console.error('Rate limit increment error:', error);
    throw error;
  }
}

// Reset rate limit for identifier
async function resetRateLimit(
  identifier: string,
  limitType: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('rate_limits')
      .delete()
      .eq('identifier', identifier)
      .eq('limit_type', limitType);

    if (error) {
      throw new Error(`Reset error: ${error.message}`);
    }

    // Log the reset action
    await logSecurityEvent(identifier, limitType, {
      action: 'rate_limit_reset',
      user_id: userId,
      reset_by: 'system' // In production, track who performed the reset
    });

    return {
      success: true,
      message: 'Rate limit reset successfully'
    };

  } catch (error) {
    console.error('Rate limit reset error:', error);
    return {
      success: false,
      message: 'Failed to reset rate limit'
    };
  }
}

// Get detailed rate limit status
async function getRateLimitStatus(
  identifier: string,
  limitType?: string
): Promise<{
  success: boolean;
  status?: Record<string, any>;
  message?: string;
}> {
  try {
    let query = supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier);

    if (limitType) {
      query = query.eq('limit_type', limitType);
    }

    const { data: rateLimits, error } = await query.order('window_start', { ascending: false });

    if (error) {
      throw new Error(`Status query error: ${error.message}`);
    }

    const status = {};
    
    if (rateLimits) {
      for (const limit of rateLimits) {
        const config = DEFAULT_RATE_LIMITS[limit.limit_type];
        if (config) {
          status[limit.limit_type] = {
            request_count: limit.request_count,
            max_requests: config.max_requests,
            window_seconds: config.window_seconds,
            window_start: limit.window_start,
            violation_count: limit.violation_count,
            blocked_until: limit.blocked_until,
            last_request_at: limit.last_request_at,
            remaining: Math.max(0, config.max_requests - limit.request_count),
            reset_time: new Date(
              new Date(limit.window_start).getTime() + (config.window_seconds * 1000)
            ).toISOString()
          };
        }
      }
    }

    return {
      success: true,
      status
    };

  } catch (error) {
    console.error('Rate limit status error:', error);
    return {
      success: false,
      message: 'Failed to get rate limit status'
    };
  }
}

// Log security event
async function logSecurityEvent(
  identifier: string,
  limitType: string,
  eventData: Record<string, any>
): Promise<void> {
  try {
    await supabase.rpc('log_auth_event', {
      user_uuid: eventData.user_id || null,
      event_type: 'rate_limit_exceeded',
      event_data: {
        identifier,
        limit_type: limitType,
        ...eventData
      },
      risk_score: 25 // Medium risk for rate limit violations
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Configure custom rate limit
async function configureRateLimit(
  limitType: string,
  config: Partial<RateLimitConfig>
): Promise<{ success: boolean; message: string }> {
  try {
    // Store custom configuration (in a real implementation, this would be in a database table)
    DEFAULT_RATE_LIMITS[limitType] = {
      ...DEFAULT_RATE_LIMITS[limitType],
      ...config
    } as RateLimitConfig;

    return {
      success: true,
      message: 'Rate limit configured successfully'
    };

  } catch (error) {
    console.error('Rate limit configuration error:', error);
    return {
      success: false,
      message: 'Failed to configure rate limit'
    };
  }
}

// Main request handler
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    // Return available rate limit types and their configurations
    return new Response(
      JSON.stringify({
        success: true,
        rate_limits: Object.keys(DEFAULT_RATE_LIMITS),
        configurations: DEFAULT_RATE_LIMITS
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }

  try {
    const body: RateLimitRequest = await req.json();
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    req.headers.get('cf-connecting-ip') || // Cloudflare
                    '127.0.0.1';

    // Use provided identifier or fall back to IP
    const identifier = body.identifier || clientIP;

    let result;

    switch (body.action) {
      case 'check_limit':
        if (!body.limit_type) {
          return new Response(
            JSON.stringify({ error: 'Limit type is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        const status = await checkRateLimit(
          identifier,
          body.limit_type,
          body.user_id,
          body.endpoint,
          body.metadata
        );

        result = { success: true, status };
        break;

      case 'increment_counter':
        if (!body.limit_type) {
          return new Response(
            JSON.stringify({ error: 'Limit type is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await incrementRateLimit(
          identifier,
          body.limit_type,
          body.user_id,
          body.endpoint,
          body.metadata
        );
        break;

      case 'reset_limit':
        if (!body.limit_type) {
          return new Response(
            JSON.stringify({ error: 'Limit type is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await resetRateLimit(identifier, body.limit_type, body.user_id);
        break;

      case 'get_status':
        result = await getRateLimitStatus(identifier, body.limit_type);
        break;

      case 'configure_limit':
        if (!body.limit_type || !body.limit_config) {
          return new Response(
            JSON.stringify({ error: 'Limit type and configuration are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await configureRateLimit(body.limit_type, body.limit_config);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        );
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Rate limiting service error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});