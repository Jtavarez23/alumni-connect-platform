// ================================================================
// ALUMNI CONNECT: OAUTH INTEGRATION SERVICE
// File: oauth-integration/index.ts
// Purpose: Handle OAuth flows for Google, Facebook, LinkedIn
// ================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

interface OAuthRequest {
  action: 'initiate' | 'callback' | 'link' | 'unlink' | 'sync';
  provider: 'google' | 'facebook' | 'linkedin' | 'github' | 'microsoft';
  code?: string;
  state?: string;
  user_id?: string;
  redirect_url?: string;
  scopes?: string[];
}

interface OAuthConfig {
  client_id: string;
  client_secret: string;
  scopes: string[];
  authorize_url: string;
  token_url: string;
  user_info_url: string;
  redirect_urls: string[];
}

const OAUTH_CONFIGS: Record<string, Partial<OAuthConfig>> = {
  google: {
    scopes: ['openid', 'email', 'profile'],
    authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    user_info_url: 'https://www.googleapis.com/oauth2/v2/userinfo'
  },
  facebook: {
    scopes: ['email', 'public_profile'],
    authorize_url: 'https://www.facebook.com/v18.0/dialog/oauth',
    token_url: 'https://graph.facebook.com/v18.0/oauth/access_token',
    user_info_url: 'https://graph.facebook.com/v18.0/me'
  },
  linkedin: {
    scopes: ['openid', 'profile', 'email'],
    authorize_url: 'https://www.linkedin.com/oauth/v2/authorization',
    token_url: 'https://www.linkedin.com/oauth/v2/accessToken',
    user_info_url: 'https://api.linkedin.com/v2/userinfo'
  },
  github: {
    scopes: ['user:email', 'read:user'],
    authorize_url: 'https://github.com/login/oauth/authorize',
    token_url: 'https://github.com/login/oauth/access_token',
    user_info_url: 'https://api.github.com/user'
  },
  microsoft: {
    scopes: ['openid', 'profile', 'email'],
    authorize_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    user_info_url: 'https://graph.microsoft.com/v1.0/me'
  }
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Generate secure state parameter
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Get OAuth configuration from database
async function getOAuthConfig(provider: string): Promise<OAuthConfig | null> {
  const { data, error } = await supabase
    .from('oauth_providers')
    .select('*')
    .eq('provider_name', provider)
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    console.error(`OAuth config not found for provider: ${provider}`, error);
    return null;
  }

  const baseConfig = OAUTH_CONFIGS[provider];
  if (!baseConfig) {
    console.error(`Base OAuth config not found for provider: ${provider}`);
    return null;
  }

  return {
    client_id: data.client_id,
    client_secret: data.client_secret_encrypted, // Should be decrypted in production
    scopes: data.scopes || baseConfig.scopes || [],
    authorize_url: baseConfig.authorize_url!,
    token_url: baseConfig.token_url!,
    user_info_url: baseConfig.user_info_url!,
    redirect_urls: data.redirect_urls || []
  };
}

// Store OAuth state for CSRF protection
async function storeOAuthState(
  state: string,
  provider: string,
  userId?: string,
  redirectUrl?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const { error } = await supabase
    .from('oauth_states')
    .insert({
      state,
      provider,
      user_id: userId,
      redirect_url: redirectUrl,
      expires_at: expiresAt.toISOString()
    });

  if (error) {
    console.error('Failed to store OAuth state:', error);
    throw new Error('Failed to store OAuth state');
  }
}

// Verify OAuth state
async function verifyOAuthState(
  state: string,
  provider: string
): Promise<{ user_id?: string; redirect_url?: string } | null> {
  const { data, error } = await supabase
    .from('oauth_states')
    .select('user_id, redirect_url')
    .eq('state', state)
    .eq('provider', provider)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    console.error('Invalid or expired OAuth state:', error);
    return null;
  }

  // Delete the used state
  await supabase
    .from('oauth_states')
    .delete()
    .eq('state', state);

  return data;
}

// Exchange authorization code for access token
async function exchangeCodeForToken(
  provider: string,
  code: string,
  config: OAuthConfig,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  try {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.client_id,
      client_secret: config.client_secret,
      code,
      redirect_uri: redirectUri
    });

    const response = await fetch(config.token_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token exchange failed for ${provider}:`, errorText);
      return null;
    }

    const tokenData = await response.json();
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    };

  } catch (error) {
    console.error(`Token exchange error for ${provider}:`, error);
    return null;
  }
}

// Get user information from OAuth provider
async function getUserInfo(
  provider: string,
  accessToken: string,
  config: OAuthConfig
): Promise<any> {
  try {
    const response = await fetch(config.user_info_url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`User info fetch failed for ${provider}:`, errorText);
      return null;
    }

    return await response.json();

  } catch (error) {
    console.error(`User info fetch error for ${provider}:`, error);
    return null;
  }
}

// Normalize user data across providers
function normalizeUserData(provider: string, userData: any): {
  provider_user_id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  verified_email: boolean;
} {
  switch (provider) {
    case 'google':
      return {
        provider_user_id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        verified_email: userData.verified_email || false
      };

    case 'facebook':
      return {
        provider_user_id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture?.data?.url,
        verified_email: true // Facebook emails are always verified
      };

    case 'linkedin':
      return {
        provider_user_id: userData.sub,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        verified_email: userData.email_verified || false
      };

    case 'github':
      return {
        provider_user_id: userData.id.toString(),
        email: userData.email,
        name: userData.name || userData.login,
        picture: userData.avatar_url,
        verified_email: true // GitHub emails are verified
      };

    case 'microsoft':
      return {
        provider_user_id: userData.id,
        email: userData.mail || userData.userPrincipalName,
        name: userData.displayName,
        picture: null, // Microsoft Graph doesn't provide picture in basic profile
        verified_email: true // Microsoft emails are verified
      };

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Link OAuth account to user
async function linkOAuthAccount(
  userId: string,
  provider: string,
  normalizedData: any,
  accessToken: string,
  refreshToken?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if this OAuth account is already linked to another user
    const { data: existingAccount, error: checkError } = await supabase
      .from('oauth_accounts')
      .select('user_id')
      .eq('provider_name', provider)
      .eq('provider_user_id', normalizedData.provider_user_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Database check failed: ${checkError.message}`);
    }

    if (existingAccount && existingAccount.user_id !== userId) {
      return {
        success: false,
        message: 'This account is already linked to another user'
      };
    }

    // Store or update OAuth account
    const { error: upsertError } = await supabase
      .from('oauth_accounts')
      .upsert({
        user_id: userId,
        provider_name: provider,
        provider_user_id: normalizedData.provider_user_id,
        provider_email: normalizedData.email,
        provider_data: {
          name: normalizedData.name,
          picture: normalizedData.picture,
          verified_email: normalizedData.verified_email,
          access_token: accessToken,
          refresh_token: refreshToken,
          linked_at: new Date().toISOString()
        },
        is_verified: normalizedData.verified_email,
        last_sync_at: new Date().toISOString()
      });

    if (upsertError) {
      throw new Error(`Failed to link OAuth account: ${upsertError.message}`);
    }

    // Update user profile with OAuth data if not already set
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: supabase.raw(`COALESCE(full_name, '${normalizedData.name}')`),
        avatar_url: supabase.raw(`COALESCE(avatar_url, '${normalizedData.picture}')`),
        email_verified: supabase.raw(`COALESCE(email_verified, ${normalizedData.verified_email})`),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to update profile with OAuth data:', profileError);
    }

    // Log the successful linking
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: 'oauth_linked',
      event_data: { 
        provider,
        provider_email: normalizedData.email
      }
    });

    return {
      success: true,
      message: `Successfully linked ${provider} account`
    };

  } catch (error) {
    console.error(`OAuth linking error for ${provider}:`, error);
    return {
      success: false,
      message: 'Failed to link OAuth account'
    };
  }
}

// Unlink OAuth account
async function unlinkOAuthAccount(
  userId: string,
  provider: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('oauth_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('provider_name', provider);

    if (error) {
      throw new Error(`Failed to unlink OAuth account: ${error.message}`);
    }

    // Log the unlinking
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: 'oauth_unlinked',
      event_data: { provider }
    });

    return {
      success: true,
      message: `Successfully unlinked ${provider} account`
    };

  } catch (error) {
    console.error(`OAuth unlinking error for ${provider}:`, error);
    return {
      success: false,
      message: 'Failed to unlink OAuth account'
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
    const body: OAuthRequest = await req.json();
    const { action, provider, code, state, user_id, redirect_url, scopes } = body;

    if (!provider || !OAUTH_CONFIGS[provider]) {
      return new Response(
        JSON.stringify({ error: 'Invalid or unsupported provider' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    // Get OAuth configuration
    const config = await getOAuthConfig(provider);
    if (!config) {
      return new Response(
        JSON.stringify({ 
          error: 'Provider not configured',
          message: `${provider} OAuth is not properly configured`
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    let result;

    switch (action) {
      case 'initiate': {
        const oauthState = generateState();
        const redirectUri = redirect_url || config.redirect_urls[0];
        
        if (!redirectUri) {
          return new Response(
            JSON.stringify({ error: 'No redirect URL configured' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        // Store state for CSRF protection
        await storeOAuthState(oauthState, provider, user_id, redirect_url);

        // Build authorization URL
        const authParams = new URLSearchParams({
          response_type: 'code',
          client_id: config.client_id,
          redirect_uri: redirectUri,
          scope: (scopes || config.scopes).join(' '),
          state: oauthState,
          access_type: 'offline', // For refresh tokens
          prompt: 'consent' // Force consent screen
        });

        const authUrl = `${config.authorize_url}?${authParams.toString()}`;

        result = {
          success: true,
          auth_url: authUrl,
          state: oauthState
        };
        break;
      }

      case 'callback': {
        if (!code || !state) {
          return new Response(
            JSON.stringify({ error: 'Missing authorization code or state' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        // Verify state for CSRF protection
        const stateData = await verifyOAuthState(state, provider);
        if (!stateData) {
          return new Response(
            JSON.stringify({ error: 'Invalid or expired state parameter' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        const redirectUri = stateData.redirect_url || config.redirect_urls[0];

        // Exchange code for token
        const tokenData = await exchangeCodeForToken(provider, code, config, redirectUri);
        if (!tokenData) {
          return new Response(
            JSON.stringify({ error: 'Failed to exchange authorization code for token' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        // Get user info from provider
        const userInfo = await getUserInfo(provider, tokenData.access_token, config);
        if (!userInfo) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch user information from provider' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        // Normalize user data
        const normalizedData = normalizeUserData(provider, userInfo);

        // If user_id is provided (linking to existing account)
        if (stateData.user_id) {
          result = await linkOAuthAccount(
            stateData.user_id,
            provider,
            normalizedData,
            tokenData.access_token,
            tokenData.refresh_token
          );
        } else {
          // Return user data for account creation/login
          result = {
            success: true,
            user_data: normalizedData,
            tokens: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_in: tokenData.expires_in
            }
          };
        }
        break;
      }

      case 'link': {
        if (!user_id || !code || !state) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters for linking' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        // This case is handled in the callback action when user_id is provided
        result = { success: false, message: 'Use callback action for linking' };
        break;
      }

      case 'unlink': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required for unlinking' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await unlinkOAuthAccount(user_id, provider);
        break;
      }

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
    console.error('OAuth service error:', error);
    
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