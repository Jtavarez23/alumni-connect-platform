// ================================================================
// ALUMNI CONNECT: CONSENT MANAGEMENT SERVICE
// File: consent-management/index.ts
// Purpose: Handle GDPR consent management for yearbook processing and data handling
// ================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

interface ConsentRequest {
  action: 'give_consent' | 'withdraw_consent' | 'check_consent' | 'list_consents' | 'batch_consent';
  user_id?: string;
  consent_type?: string;
  consent_given?: boolean;
  consent_version?: string;
  consent_method?: string;
  consent_details?: Record<string, any>;
  consent_batch?: Array<{
    consent_type: string;
    consent_given: boolean;
  }>;
}

interface ConsentRecord {
  id: string;
  consent_type: string;
  consent_given: boolean;
  consent_version: string;
  consent_method: string;
  consent_details: Record<string, any>;
  given_at: string;
  withdrawn_at?: string;
  ip_address: string;
  user_agent: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Available consent types with descriptions and requirements
const CONSENT_TYPES = {
  // Core data processing consents
  data_processing: {
    name: 'Data Processing',
    description: 'Allow processing of personal data for core platform functionality',
    required: true,
    category: 'essential',
    legal_basis: 'legitimate_interest'
  },
  
  // Marketing and communications
  marketing: {
    name: 'Marketing Communications',
    description: 'Receive marketing emails, newsletters, and promotional content',
    required: false,
    category: 'marketing',
    legal_basis: 'consent'
  },
  
  analytics: {
    name: 'Analytics',
    description: 'Allow collection of usage analytics to improve the platform',
    required: false,
    category: 'analytics',
    legal_basis: 'consent'
  },
  
  // Yearbook-specific consents
  yearbook_processing: {
    name: 'Yearbook Processing',
    description: 'Allow processing and analysis of yearbook content including photos',
    required: false,
    category: 'yearbook',
    legal_basis: 'consent',
    special_category: true // Biometric data
  },
  
  photo_recognition: {
    name: 'Photo Recognition',
    description: 'Use AI/ML technology to identify faces in yearbook photos',
    required: false,
    category: 'yearbook',
    legal_basis: 'consent',
    special_category: true // Biometric data
  },
  
  photo_tagging: {
    name: 'Photo Tagging',
    description: 'Allow others to tag you in yearbook photos',
    required: false,
    category: 'yearbook',
    legal_basis: 'consent'
  },
  
  yearbook_sharing: {
    name: 'Yearbook Sharing',
    description: 'Share your yearbook content with other verified alumni',
    required: false,
    category: 'yearbook',
    legal_basis: 'consent'
  },
  
  // Data sharing consents
  data_sharing: {
    name: 'Data Sharing with Schools',
    description: 'Share verification status and basic info with educational institutions',
    required: false,
    category: 'sharing',
    legal_basis: 'consent'
  },
  
  third_party_integrations: {
    name: 'Third-party Integrations',
    description: 'Connect with external services (LinkedIn, social media, etc.)',
    required: false,
    category: 'integrations',
    legal_basis: 'consent'
  },
  
  // Advanced features
  ai_recommendations: {
    name: 'AI Recommendations',
    description: 'Use AI to suggest connections, events, and content',
    required: false,
    category: 'ai',
    legal_basis: 'consent'
  },
  
  location_services: {
    name: 'Location Services',
    description: 'Use location data for local events and connections',
    required: false,
    category: 'location',
    legal_basis: 'consent'
  }
};

// Current privacy policy version
const CURRENT_PRIVACY_VERSION = 'v2.0-2025';

// Give or update consent
async function giveConsent(
  userId: string,
  consentType: string,
  consentGiven: boolean,
  consentVersion: string = CURRENT_PRIVACY_VERSION,
  consentMethod: string = 'explicit_opt_in',
  consentDetails: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; consent_id?: string; message?: string }> {
  try {
    // Validate consent type
    if (!CONSENT_TYPES[consentType]) {
      return {
        success: false,
        message: `Invalid consent type: ${consentType}`
      };
    }

    const consentInfo = CONSENT_TYPES[consentType];

    // Check if this is a required consent being withdrawn
    if (consentInfo.required && !consentGiven) {
      return {
        success: false,
        message: `Cannot withdraw consent for required processing: ${consentInfo.name}`
      };
    }

    // Record consent using the database function
    const { data: consentId, error } = await supabase.rpc('record_gdpr_consent', {
      user_uuid: userId,
      consent_type_val: consentType,
      consent_given_val: consentGiven,
      consent_version_val: consentVersion,
      consent_method_val: consentMethod,
      details: {
        ...consentDetails,
        consent_name: consentInfo.name,
        consent_category: consentInfo.category,
        legal_basis: consentInfo.legal_basis,
        special_category: consentInfo.special_category || false,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });

    if (error) {
      throw new Error(`Failed to record consent: ${error.message}`);
    }

    // Log the consent action
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: consentGiven ? 'consent_given' : 'consent_withdrawn',
      event_data: {
        consent_type: consentType,
        consent_version: consentVersion,
        consent_method: consentMethod,
        consent_category: consentInfo.category
      }
    });

    // Handle special processing based on consent type
    if (consentGiven) {
      await handleConsentGranted(userId, consentType, consentDetails);
    } else {
      await handleConsentWithdrawn(userId, consentType, consentDetails);
    }

    return {
      success: true,
      consent_id: consentId,
      message: `Consent ${consentGiven ? 'granted' : 'withdrawn'} for ${consentInfo.name}`
    };

  } catch (error) {
    console.error('Consent recording error:', error);
    return {
      success: false,
      message: 'Failed to record consent'
    };
  }
}

// Handle actions when consent is granted
async function handleConsentGranted(
  userId: string,
  consentType: string,
  details: Record<string, any>
): Promise<void> {
  try {
    switch (consentType) {
      case 'yearbook_processing':
        // Enable yearbook processing for user
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            yearbook_processing_enabled: true,
            updated_at: new Date().toISOString()
          });
        break;

      case 'photo_recognition':
        // Enable photo recognition features
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            photo_recognition_enabled: true,
            updated_at: new Date().toISOString()
          });
        
        // Queue user's photos for facial recognition processing
        await queueUserPhotosForProcessing(userId);
        break;

      case 'photo_tagging':
        // Enable photo tagging features
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            photo_tagging_enabled: true,
            updated_at: new Date().toISOString()
          });
        break;

      case 'marketing':
        // Subscribe to marketing communications
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            marketing_emails: true,
            updated_at: new Date().toISOString()
          });
        break;

      case 'analytics':
        // Enable analytics tracking
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            analytics_enabled: true,
            updated_at: new Date().toISOString()
          });
        break;

      default:
        // For other consent types, just update preferences generically
        const updateField = `${consentType}_enabled`;
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            [updateField]: true,
            updated_at: new Date().toISOString()
          });
        break;
    }
  } catch (error) {
    console.error(`Failed to handle consent granted for ${consentType}:`, error);
  }
}

// Handle actions when consent is withdrawn
async function handleConsentWithdrawn(
  userId: string,
  consentType: string,
  details: Record<string, any>
): Promise<void> {
  try {
    switch (consentType) {
      case 'yearbook_processing':
        // Disable yearbook processing
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            yearbook_processing_enabled: false,
            updated_at: new Date().toISOString()
          });
        
        // Stop any active yearbook processing jobs for this user
        await stopYearbookProcessing(userId);
        break;

      case 'photo_recognition':
        // Disable photo recognition and delete biometric data
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            photo_recognition_enabled: false,
            updated_at: new Date().toISOString()
          });
        
        // Delete facial recognition data
        await deleteFacialRecognitionData(userId);
        break;

      case 'photo_tagging':
        // Disable photo tagging
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            photo_tagging_enabled: false,
            updated_at: new Date().toISOString()
          });
        
        // Remove existing tags
        await removeUserPhotoTags(userId);
        break;

      case 'marketing':
        // Unsubscribe from marketing
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            marketing_emails: false,
            updated_at: new Date().toISOString()
          });
        break;

      case 'analytics':
        // Disable analytics and anonymize existing data
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            analytics_enabled: false,
            updated_at: new Date().toISOString()
          });
        
        await anonymizeAnalyticsData(userId);
        break;

      default:
        // For other consent types, just update preferences generically
        const updateField = `${consentType}_enabled`;
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            [updateField]: false,
            updated_at: new Date().toISOString()
          });
        break;
    }
  } catch (error) {
    console.error(`Failed to handle consent withdrawn for ${consentType}:`, error);
  }
}

// Queue user photos for facial recognition processing
async function queueUserPhotosForProcessing(userId: string): Promise<void> {
  try {
    // Find user's claimed photos that haven't been processed
    const { data: unprocessedPhotos } = await supabase
      .from('yearbook_faces')
      .select('id, page_id')
      .eq('claimed_by', userId)
      .is('face_encoding', null);

    if (unprocessedPhotos && unprocessedPhotos.length > 0) {
      // Queue for facial recognition processing
      for (const photo of unprocessedPhotos) {
        await supabase
          .from('processing_queue')
          .insert({
            job_type: 'facial_recognition',
            job_data: {
              user_id: userId,
              face_id: photo.id,
              page_id: photo.page_id
            },
            priority: 'normal',
            created_at: new Date().toISOString()
          });
      }
    }
  } catch (error) {
    console.error('Failed to queue photos for processing:', error);
  }
}

// Stop yearbook processing for user
async function stopYearbookProcessing(userId: string): Promise<void> {
  try {
    // Cancel any pending processing jobs
    await supabase
      .from('processing_queue')
      .update({ status: 'cancelled' })
      .eq('job_data->>user_id', userId)
      .in('job_type', ['ocr', 'facial_recognition', 'yearbook_analysis']);
  } catch (error) {
    console.error('Failed to stop yearbook processing:', error);
  }
}

// Delete facial recognition data
async function deleteFacialRecognitionData(userId: string): Promise<void> {
  try {
    // Remove face encodings and biometric data
    await supabase
      .from('yearbook_faces')
      .update({ 
        face_encoding: null,
        face_vector: null,
        confidence_score: null
      })
      .eq('claimed_by', userId);
    
    // Log the deletion for audit purposes
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: 'biometric_data_deleted',
      event_data: { reason: 'consent_withdrawn' }
    });
  } catch (error) {
    console.error('Failed to delete facial recognition data:', error);
  }
}

// Remove user photo tags
async function removeUserPhotoTags(userId: string): Promise<void> {
  try {
    await supabase
      .from('photo_tags')
      .delete()
      .eq('tagged_user_id', userId);
  } catch (error) {
    console.error('Failed to remove photo tags:', error);
  }
}

// Anonymize analytics data
async function anonymizeAnalyticsData(userId: string): Promise<void> {
  try {
    // Replace user ID with anonymous identifier in activity logs
    await supabase
      .from('activity_feed')
      .update({ 
        user_id: null,
        metadata: supabase.raw("metadata || '{\"anonymized\": true}'::jsonb")
      })
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days only
  } catch (error) {
    console.error('Failed to anonymize analytics data:', error);
  }
}

// Check user's current consent status
async function checkConsent(userId: string, consentType?: string): Promise<{
  success: boolean;
  consents?: Record<string, any>;
  message?: string;
}> {
  try {
    const { data: consents, error } = await supabase.rpc('get_user_consents', {
      user_uuid: userId
    });

    if (error) {
      throw new Error(`Failed to get consents: ${error.message}`);
    }

    if (consentType) {
      // Return specific consent
      const specificConsent = consents?.find(c => c.consent_type === consentType);
      return {
        success: true,
        consents: specificConsent ? {
          [consentType]: {
            given: specificConsent.consent_given,
            version: specificConsent.consent_version,
            given_at: specificConsent.given_at,
            withdrawn_at: specificConsent.withdrawn_at
          }
        } : {}
      };
    }

    // Return all consents with metadata
    const consentMap = {};
    if (consents) {
      for (const consent of consents) {
        consentMap[consent.consent_type] = {
          given: consent.consent_given,
          version: consent.consent_version,
          given_at: consent.given_at,
          withdrawn_at: consent.withdrawn_at,
          info: CONSENT_TYPES[consent.consent_type] || null
        };
      }
    }

    return {
      success: true,
      consents: consentMap
    };

  } catch (error) {
    console.error('Consent check error:', error);
    return {
      success: false,
      message: 'Failed to check consent status'
    };
  }
}

// Process batch consent updates
async function batchConsent(
  userId: string,
  consentBatch: Array<{ consent_type: string; consent_given: boolean }>,
  consentVersion: string = CURRENT_PRIVACY_VERSION,
  consentMethod: string = 'settings_update',
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; results?: Array<any>; message?: string }> {
  try {
    const results = [];

    for (const consent of consentBatch) {
      const result = await giveConsent(
        userId,
        consent.consent_type,
        consent.consent_given,
        consentVersion,
        consentMethod,
        {},
        ipAddress,
        userAgent
      );
      results.push({
        consent_type: consent.consent_type,
        ...result
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return {
      success: successCount === totalCount,
      results,
      message: `Processed ${successCount}/${totalCount} consent updates successfully`
    };

  } catch (error) {
    console.error('Batch consent error:', error);
    return {
      success: false,
      message: 'Failed to process batch consent updates'
    };
  }
}

// Get consent requirements for user
async function getConsentRequirements(): Promise<{
  success: boolean;
  requirements?: Record<string, any>;
  current_version?: string;
}> {
  const requirements = {};
  
  for (const [key, info] of Object.entries(CONSENT_TYPES)) {
    requirements[key] = {
      name: info.name,
      description: info.description,
      required: info.required,
      category: info.category,
      legal_basis: info.legal_basis,
      special_category: info.special_category || false
    };
  }

  return {
    success: true,
    requirements,
    current_version: CURRENT_PRIVACY_VERSION
  };
}

// Main request handler
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    // Return consent requirements
    const result = await getConsentRequirements();
    return new Response(
      JSON.stringify(result),
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
    const body: ConsentRequest = await req.json();
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    let result;

    switch (body.action) {
      case 'give_consent':
        if (!body.user_id || !body.consent_type || body.consent_given === undefined) {
          return new Response(
            JSON.stringify({ error: 'User ID, consent type, and consent status are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await giveConsent(
          body.user_id,
          body.consent_type,
          body.consent_given,
          body.consent_version,
          body.consent_method,
          body.consent_details,
          clientIP,
          userAgent
        );
        break;

      case 'withdraw_consent':
        if (!body.user_id || !body.consent_type) {
          return new Response(
            JSON.stringify({ error: 'User ID and consent type are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await giveConsent(
          body.user_id,
          body.consent_type,
          false,
          body.consent_version,
          'withdrawal',
          body.consent_details,
          clientIP,
          userAgent
        );
        break;

      case 'check_consent':
        if (!body.user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await checkConsent(body.user_id, body.consent_type);
        break;

      case 'batch_consent':
        if (!body.user_id || !body.consent_batch || !Array.isArray(body.consent_batch)) {
          return new Response(
            JSON.stringify({ error: 'User ID and consent batch array are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await batchConsent(
          body.user_id,
          body.consent_batch,
          body.consent_version,
          body.consent_method,
          clientIP,
          userAgent
        );
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
    console.error('Consent management service error:', error);
    
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