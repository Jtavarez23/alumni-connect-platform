// ================================================================
// ALUMNI CONNECT: EMAIL/SMS VERIFICATION SERVICE
// File: auth-verification/index.ts
// Purpose: Handle email and SMS verification flows with security
// ================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

interface VerificationRequest {
  action: 'send_email' | 'send_sms' | 'verify_email' | 'verify_sms' | 'resend';
  email?: string;
  phone?: string;
  code?: string;
  token?: string;
  user_id?: string;
}

interface RateLimitConfig {
  max_attempts: number;
  window_minutes: number;
  lockout_minutes: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  send_email: { max_attempts: 5, window_minutes: 15, lockout_minutes: 60 },
  send_sms: { max_attempts: 3, window_minutes: 15, lockout_minutes: 120 },
  verify_email: { max_attempts: 10, window_minutes: 15, lockout_minutes: 30 },
  verify_sms: { max_attempts: 5, window_minutes: 15, lockout_minutes: 60 },
  resend: { max_attempts: 3, window_minutes: 30, lockout_minutes: 60 }
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Generate secure verification code
function generateVerificationCode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    code += digits[randomIndex];
  }
  
  return code;
}

// Generate secure token for email verification
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Check rate limits
async function checkRateLimit(
  identifier: string, 
  action: string
): Promise<{ allowed: boolean; remaining?: number; resetTime?: Date }> {
  const config = RATE_LIMITS[action];
  if (!config) return { allowed: true };

  const { data, error } = await supabase.rpc('check_rate_limit', {
    identifier_val: identifier,
    action_type_val: action,
    max_attempts: config.max_attempts,
    window_minutes: config.window_minutes
  });

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: false };
  }

  return { allowed: data };
}

// Increment rate limit counter
async function incrementRateLimit(identifier: string, action: string): Promise<void> {
  const { error } = await supabase.rpc('increment_rate_limit', {
    identifier_val: identifier,
    action_type_val: action
  });

  if (error) {
    console.error('Rate limit increment error:', error);
  }
}

// Log authentication event
async function logAuthEvent(
  userId: string | null,
  eventType: string,
  eventData: Record<string, any> = {},
  riskScore: number = 0
): Promise<void> {
  const { error } = await supabase.rpc('log_auth_event', {
    user_uuid: userId,
    event_type: eventType,
    event_data: eventData,
    risk_score: riskScore
  });

  if (error) {
    console.error('Auth event logging error:', error);
  }
}

// Send email verification
async function sendEmailVerification(email: string, userId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const code = generateVerificationCode(6);
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification code
    const { error: storeError } = await supabase
      .from('email_verifications')
      .insert({
        email,
        code,
        token,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        attempts: 0
      });

    if (storeError) {
      throw new Error(`Failed to store verification: ${storeError.message}`);
    }

    // Send email via external service (Resend, SendGrid, etc.)
    const emailSent = await sendEmailViaProvider(email, code, token);

    if (!emailSent) {
      throw new Error('Failed to send email');
    }

    await logAuthEvent(userId || null, 'email_verification_sent', { 
      email,
      method: 'email' 
    });

    return { 
      success: true, 
      message: 'Verification email sent successfully' 
    };

  } catch (error) {
    console.error('Email verification error:', error);
    await logAuthEvent(userId || null, 'email_verification_failed', { 
      email,
      error: error.message 
    }, 25);

    return { 
      success: false, 
      message: 'Failed to send verification email' 
    };
  }
}

// Send SMS verification
async function sendSMSVerification(phone: string, userId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const code = generateVerificationCode(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code
    const { error: storeError } = await supabase
      .from('sms_verifications')
      .insert({
        phone,
        code,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        attempts: 0
      });

    if (storeError) {
      throw new Error(`Failed to store verification: ${storeError.message}`);
    }

    // Send SMS via external service (Twilio, etc.)
    const smsSent = await sendSMSViaProvider(phone, code);

    if (!smsSent) {
      throw new Error('Failed to send SMS');
    }

    await logAuthEvent(userId || null, 'phone_verification_sent', { 
      phone: phone.slice(-4), // Only log last 4 digits for privacy
      method: 'sms' 
    });

    return { 
      success: true, 
      message: 'Verification SMS sent successfully' 
    };

  } catch (error) {
    console.error('SMS verification error:', error);
    await logAuthEvent(userId || null, 'phone_verification_failed', { 
      phone: phone.slice(-4),
      error: error.message 
    }, 25);

    return { 
      success: false, 
      message: 'Failed to send verification SMS' 
    };
  }
}

// Verify email code/token
async function verifyEmail(
  code?: string, 
  token?: string, 
  email?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    let query = supabase
      .from('email_verifications')
      .select('*')
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString());

    if (code && email) {
      query = query.eq('email', email).eq('code', code);
    } else if (token) {
      query = query.eq('token', token);
    } else {
      return { success: false, message: 'Invalid verification parameters' };
    }

    const { data: verification, error } = await query.single();

    if (error || !verification) {
      await logAuthEvent(null, 'email_verification_failed', { 
        email,
        reason: 'invalid_code_or_expired' 
      }, 15);
      
      return { 
        success: false, 
        message: 'Invalid or expired verification code' 
      };
    }

    // Check attempt count
    if (verification.attempts >= 5) {
      await logAuthEvent(verification.user_id, 'email_verification_failed', { 
        email: verification.email,
        reason: 'too_many_attempts' 
      }, 50);
      
      return { 
        success: false, 
        message: 'Too many verification attempts' 
      };
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('email_verifications')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    if (updateError) {
      throw new Error('Failed to update verification status');
    }

    // Update user email verification status if user exists
    if (verification.user_id) {
      const { error: userError } = await supabase
        .from('profiles')
        .update({ 
          email_verified: true,
          email_verified_at: new Date().toISOString()
        })
        .eq('id', verification.user_id);

      if (userError) {
        console.error('Failed to update user email verification:', userError);
      }
    }

    await logAuthEvent(verification.user_id, 'email_verification_success', { 
      email: verification.email 
    });

    return { 
      success: true, 
      message: 'Email verified successfully',
      data: { user_id: verification.user_id, email: verification.email }
    };

  } catch (error) {
    console.error('Email verification error:', error);
    return { 
      success: false, 
      message: 'Verification failed' 
    };
  }
}

// Verify SMS code
async function verifySMS(
  phone: string, 
  code: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const { data: verification, error } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !verification) {
      // Increment attempts
      await supabase
        .from('sms_verifications')
        .update({ attempts: supabase.raw('attempts + 1') })
        .eq('phone', phone)
        .eq('code', code);

      await logAuthEvent(null, 'phone_verification_failed', { 
        phone: phone.slice(-4),
        reason: 'invalid_code_or_expired' 
      }, 15);
      
      return { 
        success: false, 
        message: 'Invalid or expired verification code' 
      };
    }

    // Check attempt count
    if (verification.attempts >= 3) {
      await logAuthEvent(verification.user_id, 'phone_verification_failed', { 
        phone: phone.slice(-4),
        reason: 'too_many_attempts' 
      }, 50);
      
      return { 
        success: false, 
        message: 'Too many verification attempts' 
      };
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('sms_verifications')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    if (updateError) {
      throw new Error('Failed to update verification status');
    }

    // Update user phone verification status if user exists
    if (verification.user_id) {
      const { error: userError } = await supabase
        .from('profiles')
        .update({ 
          phone_verified: true,
          phone_verified_at: new Date().toISOString()
        })
        .eq('id', verification.user_id);

      if (userError) {
        console.error('Failed to update user phone verification:', userError);
      }
    }

    await logAuthEvent(verification.user_id, 'phone_verification_success', { 
      phone: phone.slice(-4)
    });

    return { 
      success: true, 
      message: 'Phone verified successfully',
      data: { user_id: verification.user_id, phone: phone.slice(-4) }
    };

  } catch (error) {
    console.error('SMS verification error:', error);
    return { 
      success: false, 
      message: 'Verification failed' 
    };
  }
}

// External email provider integration (mock for now)
async function sendEmailViaProvider(
  email: string, 
  code: string, 
  token: string
): Promise<boolean> {
  // Integration with email service (Resend, SendGrid, etc.)
  console.log(`Sending email to ${email} with code ${code} and token ${token}`);
  
  // Mock implementation - replace with actual email service
  return true;
}

// External SMS provider integration (mock for now)
async function sendSMSViaProvider(phone: string, code: string): Promise<boolean> {
  // Integration with SMS service (Twilio, etc.)
  console.log(`Sending SMS to ${phone} with code ${code}`);
  
  // Mock implementation - replace with actual SMS service
  return true;
}

// Main request handler
serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body: VerificationRequest = await req.json();
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';

    // Rate limiting check
    const rateLimitKey = body.email || body.phone || clientIP;
    const rateLimitCheck = await checkRateLimit(rateLimitKey, body.action);

    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    await incrementRateLimit(rateLimitKey, body.action);

    let result;

    switch (body.action) {
      case 'send_email':
        if (!body.email) {
          return new Response(
            JSON.stringify({ error: 'Email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }
        result = await sendEmailVerification(body.email, body.user_id);
        break;

      case 'send_sms':
        if (!body.phone) {
          return new Response(
            JSON.stringify({ error: 'Phone number is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }
        result = await sendSMSVerification(body.phone, body.user_id);
        break;

      case 'verify_email':
        if (!body.code && !body.token) {
          return new Response(
            JSON.stringify({ error: 'Verification code or token is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }
        result = await verifyEmail(body.code, body.token, body.email);
        break;

      case 'verify_sms':
        if (!body.phone || !body.code) {
          return new Response(
            JSON.stringify({ error: 'Phone number and code are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }
        result = await verifySMS(body.phone, body.code);
        break;

      case 'resend':
        if (body.email) {
          result = await sendEmailVerification(body.email, body.user_id);
        } else if (body.phone) {
          result = await sendSMSVerification(body.phone, body.user_id);
        } else {
          return new Response(
            JSON.stringify({ error: 'Email or phone number is required for resend' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }
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
    console.error('Verification service error:', error);
    
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