// ================================================================
// ALUMNI CONNECT: SESSION MANAGEMENT SERVICE
// File: session-management/index.ts
// Purpose: Handle user sessions, refresh tokens, and device management
// ================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

interface SessionRequest {
  action: 'create' | 'refresh' | 'validate' | 'terminate' | 'list_devices' | 'register_device' | 'remove_device';
  session_token?: string;
  refresh_token?: string;
  user_id?: string;
  device_info?: {
    name: string;
    type: 'mobile' | 'desktop' | 'tablet' | 'unknown';
    fingerprint: string;
  };
  device_id?: string;
  remember_me?: boolean;
}

interface DeviceInfo {
  name: string;
  type: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  fingerprint: string;
  userAgent?: string;
  ipAddress?: string;
}

interface SessionInfo {
  user_id: string;
  session_token: string;
  device_info: any;
  ip_address: string;
  user_agent: string;
  location: any;
  expires_at: string;
  mfa_verified: boolean;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Generate secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate secure refresh token
function generateRefreshToken(): string {
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Get session timeout based on user trust level
async function getSessionTimeout(userId: string, rememberMe: boolean = false): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_user_trust_level', {
      user_uuid: userId
    });

    if (error) {
      console.error('Failed to get user trust level:', error);
      return 2; // Default 2 hours for unknown trust level
    }

    const trustLevel = data || 'unverified';

    // Get timeout configuration
    const { data: config, error: configError } = await supabase
      .from('auth_config')
      .select('session_timeout_hours')
      .eq('trust_level', trustLevel)
      .single();

    if (configError || !config) {
      console.error('Failed to get session timeout config:', configError);
      return 2; // Default fallback
    }

    let timeoutHours = config.session_timeout_hours;

    // Extend timeout for "remember me"
    if (rememberMe) {
      timeoutHours *= 7; // 7x longer for remember me
    }

    return timeoutHours;

  } catch (error) {
    console.error('Session timeout calculation error:', error);
    return 2; // Default fallback
  }
}

// Create new session
async function createSession(
  userId: string,
  deviceInfo: DeviceInfo,
  rememberMe: boolean = false,
  mfaVerified: boolean = false
): Promise<{ success: boolean; session_token?: string; refresh_token?: string; expires_at?: string; message?: string }> {
  try {
    // Check device limits
    const { data: existingSessions, error: countError } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (countError) {
      throw new Error(`Failed to check existing sessions: ${countError.message}`);
    }

    // Get max devices allowed for user's trust level
    const trustLevel = await supabase.rpc('get_user_trust_level', { user_uuid: userId });
    const { data: config } = await supabase
      .from('auth_config')
      .select('max_devices')
      .eq('trust_level', trustLevel.data || 'unverified')
      .single();

    const maxDevices = config?.max_devices || 5;

    if (existingSessions && existingSessions.length >= maxDevices) {
      return {
        success: false,
        message: `Maximum number of active sessions (${maxDevices}) reached`
      };
    }

    // Generate tokens
    const sessionToken = generateSessionToken();
    const refreshToken = generateRefreshToken();

    // Calculate expiration
    const timeoutHours = await getSessionTimeout(userId, rememberMe);
    const expiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000);

    // Get location info (mock for now)
    const location = { country: 'Unknown', city: 'Unknown' };

    // Create session record
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        device_info: deviceInfo,
        ip_address: deviceInfo.ipAddress || '127.0.0.1',
        user_agent: deviceInfo.userAgent || 'Unknown',
        location: location,
        expires_at: expiresAt.toISOString(),
        mfa_verified: mfaVerified
      });

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    // Store refresh token separately (encrypted in production)
    const { error: refreshError } = await supabase
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token_hash: refreshToken, // Should be hashed in production
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

    if (refreshError) {
      throw new Error(`Failed to store refresh token: ${refreshError.message}`);
    }

    // Register or update device
    await supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        device_name: deviceInfo.name,
        device_type: deviceInfo.type,
        device_fingerprint: deviceInfo.fingerprint,
        last_used_at: new Date().toISOString()
      });

    // Log session creation
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: 'login_success',
      event_data: {
        device_type: deviceInfo.type,
        remember_me: rememberMe,
        mfa_verified: mfaVerified
      }
    });

    return {
      success: true,
      session_token: sessionToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString()
    };

  } catch (error) {
    console.error('Session creation error:', error);
    return {
      success: false,
      message: 'Failed to create session'
    };
  }
}

// Validate session
async function validateSession(sessionToken: string): Promise<{ 
  valid: boolean; 
  user_id?: string; 
  expires_at?: string; 
  mfa_verified?: boolean;
  message?: string 
}> {
  try {
    const { data: session, error } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at, mfa_verified, is_active')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (error || !session) {
      return {
        valid: false,
        message: 'Invalid session token'
      };
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Mark session as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken);

      return {
        valid: false,
        message: 'Session expired'
      };
    }

    // Update last activity
    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', sessionToken);

    return {
      valid: true,
      user_id: session.user_id,
      expires_at: session.expires_at,
      mfa_verified: session.mfa_verified
    };

  } catch (error) {
    console.error('Session validation error:', error);
    return {
      valid: false,
      message: 'Session validation failed'
    };
  }
}

// Refresh session using refresh token
async function refreshSession(refreshToken: string): Promise<{
  success: boolean;
  session_token?: string;
  refresh_token?: string;
  expires_at?: string;
  message?: string;
}> {
  try {
    // Find refresh token
    const { data: tokenData, error: tokenError } = await supabase
      .from('refresh_tokens')
      .select('user_id, session_token, expires_at')
      .eq('token_hash', refreshToken)
      .eq('is_used', false)
      .single();

    if (tokenError || !tokenData) {
      return {
        success: false,
        message: 'Invalid or expired refresh token'
      };
    }

    // Check if refresh token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return {
        success: false,
        message: 'Refresh token expired'
      };
    }

    // Mark old refresh token as used
    await supabase
      .from('refresh_tokens')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('token_hash', refreshToken);

    // Get existing session info
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select('device_info, mfa_verified')
      .eq('session_token', tokenData.session_token)
      .single();

    if (sessionError || !sessionData) {
      return {
        success: false,
        message: 'Associated session not found'
      };
    }

    // Generate new tokens
    const newSessionToken = generateSessionToken();
    const newRefreshToken = generateRefreshToken();

    // Calculate new expiration
    const timeoutHours = await getSessionTimeout(tokenData.user_id);
    const newExpiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000);

    // Update session with new token and expiration
    await supabase
      .from('user_sessions')
      .update({
        session_token: newSessionToken,
        expires_at: newExpiresAt.toISOString(),
        last_activity: new Date().toISOString()
      })
      .eq('session_token', tokenData.session_token);

    // Store new refresh token
    await supabase
      .from('refresh_tokens')
      .insert({
        user_id: tokenData.user_id,
        token_hash: newRefreshToken,
        session_token: newSessionToken,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      });

    // Log session refresh
    await supabase.rpc('log_auth_event', {
      user_uuid: tokenData.user_id,
      event_type: 'session_refreshed',
      event_data: { old_session: tokenData.session_token }
    });

    return {
      success: true,
      session_token: newSessionToken,
      refresh_token: newRefreshToken,
      expires_at: newExpiresAt.toISOString()
    };

  } catch (error) {
    console.error('Session refresh error:', error);
    return {
      success: false,
      message: 'Failed to refresh session'
    };
  }
}

// Terminate session
async function terminateSession(sessionToken: string, userId?: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    let query = supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to terminate session: ${error.message}`);
    }

    // Mark associated refresh tokens as used
    await supabase
      .from('refresh_tokens')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('session_token', sessionToken);

    // Log session termination
    if (userId) {
      await supabase.rpc('log_auth_event', {
        user_uuid: userId,
        event_type: 'logout',
        event_data: { session_token: sessionToken }
      });
    }

    return {
      success: true,
      message: 'Session terminated successfully'
    };

  } catch (error) {
    console.error('Session termination error:', error);
    return {
      success: false,
      message: 'Failed to terminate session'
    };
  }
}

// List user devices
async function listUserDevices(userId: string): Promise<{
  success: boolean;
  devices?: any[];
  message?: string;
}> {
  try {
    const { data: devices, error } = await supabase
      .from('user_devices')
      .select(`
        id,
        device_name,
        device_type,
        is_trusted,
        last_used_at,
        registered_at,
        user_sessions!inner(id, is_active, last_activity)
      `)
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list devices: ${error.message}`);
    }

    return {
      success: true,
      devices: devices?.map(device => ({
        id: device.id,
        name: device.device_name,
        type: device.device_type,
        trusted: device.is_trusted,
        last_used: device.last_used_at,
        registered: device.registered_at,
        active_sessions: device.user_sessions?.filter((s: any) => s.is_active).length || 0
      })) || []
    };

  } catch (error) {
    console.error('Device listing error:', error);
    return {
      success: false,
      message: 'Failed to list devices'
    };
  }
}

// Remove device (and terminate all its sessions)
async function removeDevice(userId: string, deviceId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    // Get device info
    const { data: device, error: deviceError } = await supabase
      .from('user_devices')
      .select('device_fingerprint')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .single();

    if (deviceError || !device) {
      return {
        success: false,
        message: 'Device not found'
      };
    }

    // Terminate all sessions for this device
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .contains('device_info', { fingerprint: device.device_fingerprint });

    // Remove device
    const { error: removeError } = await supabase
      .from('user_devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', userId);

    if (removeError) {
      throw new Error(`Failed to remove device: ${removeError.message}`);
    }

    // Log device removal
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: 'device_removed',
      event_data: { device_id: deviceId }
    });

    return {
      success: true,
      message: 'Device removed successfully'
    };

  } catch (error) {
    console.error('Device removal error:', error);
    return {
      success: false,
      message: 'Failed to remove device'
    };
  }
}

// Main request handler
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    );
  }

  try {
    const body: SessionRequest = await req.json();
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    let result;

    switch (body.action) {
      case 'create':
        if (!body.user_id || !body.device_info) {
          return new Response(
            JSON.stringify({ error: 'User ID and device info are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        // Enhance device info with request data
        const enhancedDeviceInfo: DeviceInfo = {
          ...body.device_info,
          userAgent,
          ipAddress: clientIP
        };

        result = await createSession(
          body.user_id,
          enhancedDeviceInfo,
          body.remember_me,
          false // MFA verification should be handled separately
        );
        break;

      case 'validate':
        if (!body.session_token) {
          return new Response(
            JSON.stringify({ error: 'Session token is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await validateSession(body.session_token);
        break;

      case 'refresh':
        if (!body.refresh_token) {
          return new Response(
            JSON.stringify({ error: 'Refresh token is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await refreshSession(body.refresh_token);
        break;

      case 'terminate':
        if (!body.session_token) {
          return new Response(
            JSON.stringify({ error: 'Session token is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await terminateSession(body.session_token, body.user_id);
        break;

      case 'list_devices':
        if (!body.user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await listUserDevices(body.user_id);
        break;

      case 'remove_device':
        if (!body.user_id || !body.device_id) {
          return new Response(
            JSON.stringify({ error: 'User ID and device ID are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await removeDevice(body.user_id, body.device_id);
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
        status: result.success || result.valid ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Session management service error:', error);
    
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