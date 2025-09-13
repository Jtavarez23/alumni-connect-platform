// ================================================================
// ALUMNI CONNECT: GDPR DATA DELETION SERVICE
// File: gdpr-data-deletion/index.ts
// Purpose: Handle GDPR-compliant data deletion with proper cascade handling
// ================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

interface DataDeletionRequest {
  action: 'request_deletion' | 'check_status' | 'confirm_deletion' | 'cancel_deletion' | 'list_deletions';
  user_id?: string;
  deletion_id?: string;
  deletion_type?: 'account' | 'partial';
  data_categories?: string[];
  confirmation_code?: string;
  reason?: string;
}

interface DeletionJobStatus {
  id: string;
  status: 'pending_confirmation' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'failed';
  deletion_type: 'account' | 'partial';
  requested_at: string;
  confirmed_at?: string;
  completed_at?: string;
  expires_at: string;
  data_categories: string[];
  reason?: string;
  confirmation_code?: string;
  error_message?: string;
  deleted_records?: Record<string, number>;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Data categories that can be deleted
const DELETABLE_CATEGORIES = {
  profile: 'User profile information',
  posts: 'Posts and comments',
  connections: 'Social connections',
  messages: 'Private messages',
  yearbook_claims: 'Yearbook photo claims (not historical photos)',
  activity_logs: 'Activity and audit logs',
  business_listings: 'Business directory entries',
  events: 'Created events and attendance',
  preferences: 'Privacy and notification preferences',
  auth_data: 'Authentication sessions and devices'
};

// Generate secure deletion ID
function generateDeletionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `deletion_${timestamp}_${randomPart}`;
}

// Generate confirmation code
function generateConfirmationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Request data deletion
async function requestDataDeletion(
  userId: string,
  deletionType: 'account' | 'partial' = 'account',
  dataCategories: string[] = [],
  reason?: string
): Promise<{ success: boolean; deletion_id?: string; confirmation_code?: string; message?: string }> {
  try {
    // Check if user has any pending deletions
    const { data: pendingDeletions, error: checkError } = await supabase
      .from('data_deletion_jobs')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['pending_confirmation', 'confirmed', 'processing'])
      .limit(1);

    if (checkError) {
      throw new Error(`Failed to check pending deletions: ${checkError.message}`);
    }

    if (pendingDeletions && pendingDeletions.length > 0) {
      return {
        success: false,
        message: 'You already have a pending data deletion request.'
      };
    }

    // For partial deletions, validate categories
    if (deletionType === 'partial') {
      if (!dataCategories || dataCategories.length === 0) {
        return {
          success: false,
          message: 'Data categories must be specified for partial deletion'
        };
      }

      const invalidCategories = dataCategories.filter(cat => !DELETABLE_CATEGORIES[cat]);
      if (invalidCategories.length > 0) {
        return {
          success: false,
          message: `Invalid data categories: ${invalidCategories.join(', ')}`
        };
      }
    } else {
      // For account deletion, include all categories
      dataCategories = Object.keys(DELETABLE_CATEGORIES);
    }

    // Generate deletion job
    const deletionId = generateDeletionId();
    const confirmationCode = generateConfirmationCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days to confirm

    const { error: insertError } = await supabase
      .from('data_deletion_jobs')
      .insert({
        id: deletionId,
        user_id: userId,
        status: 'pending_confirmation',
        deletion_type: deletionType,
        data_categories: dataCategories,
        confirmation_code: confirmationCode,
        reason: reason,
        expires_at: expiresAt.toISOString(),
        requested_at: new Date().toISOString()
      });

    if (insertError) {
      throw new Error(`Failed to create deletion job: ${insertError.message}`);
    }

    // Log the deletion request
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: 'gdpr_deletion_requested',
      event_data: {
        deletion_id: deletionId,
        deletion_type: deletionType,
        categories: dataCategories,
        reason: reason
      },
      risk_score: deletionType === 'account' ? 10 : 5
    });

    // Send confirmation email/notification (in production)
    await sendDeletionConfirmationNotification(userId, deletionId, confirmationCode, deletionType);

    return {
      success: true,
      deletion_id: deletionId,
      confirmation_code: confirmationCode,
      message: `Data deletion request created. Please confirm within 7 days using the confirmation code sent to your email.`
    };

  } catch (error) {
    console.error('Data deletion request error:', error);
    return {
      success: false,
      message: 'Failed to request data deletion'
    };
  }
}

// Confirm data deletion
async function confirmDataDeletion(
  deletionId: string,
  userId: string,
  confirmationCode: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get deletion job
    const { data: job, error: jobError } = await supabase
      .from('data_deletion_jobs')
      .select('*')
      .eq('id', deletionId)
      .eq('user_id', userId)
      .eq('status', 'pending_confirmation')
      .single();

    if (jobError || !job) {
      return {
        success: false,
        message: 'Deletion request not found or already processed'
      };
    }

    // Check if expired
    if (new Date(job.expires_at) < new Date()) {
      await supabase
        .from('data_deletion_jobs')
        .update({ status: 'cancelled' })
        .eq('id', deletionId);

      return {
        success: false,
        message: 'Deletion request has expired'
      };
    }

    // Verify confirmation code
    if (job.confirmation_code !== confirmationCode) {
      return {
        success: false,
        message: 'Invalid confirmation code'
      };
    }

    // Mark as confirmed
    const { error: confirmError } = await supabase
      .from('data_deletion_jobs')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', deletionId);

    if (confirmError) {
      throw new Error(`Failed to confirm deletion: ${confirmError.message}`);
    }

    // Log confirmation
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: 'gdpr_deletion_confirmed',
      event_data: { deletion_id: deletionId },
      risk_score: 15
    });

    // Start processing (in production, this would be a background job)
    setTimeout(() => processDeletionJob(deletionId), 5000); // 5 second delay

    return {
      success: true,
      message: 'Data deletion confirmed. Processing will begin shortly.'
    };

  } catch (error) {
    console.error('Data deletion confirmation error:', error);
    return {
      success: false,
      message: 'Failed to confirm data deletion'
    };
  }
}

// Process deletion job
async function processDeletionJob(deletionId: string): Promise<void> {
  try {
    // Mark as processing
    await supabase
      .from('data_deletion_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', deletionId);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('data_deletion_jobs')
      .select('*')
      .eq('id', deletionId)
      .single();

    if (jobError || !job) {
      throw new Error('Deletion job not found');
    }

    console.log(`Processing deletion job ${deletionId} for user ${job.user_id}`);

    // Track deleted records
    const deletedRecords: Record<string, number> = {};

    // Execute deletion based on categories
    for (const category of job.data_categories) {
      try {
        const count = await deleteDataCategory(job.user_id, category);
        deletedRecords[category] = count;
        console.log(`Deleted ${count} records for category: ${category}`);
      } catch (error) {
        console.error(`Failed to delete category ${category}:`, error);
        deletedRecords[category] = -1; // Indicate failure
      }
    }

    // For account deletion, also handle Supabase Auth user
    if (job.deletion_type === 'account') {
      try {
        // Delete from auth.users (this will cascade to profiles)
        const { error: authError } = await supabase.auth.admin.deleteUser(job.user_id);
        if (authError) {
          console.error('Failed to delete auth user:', authError);
        } else {
          deletedRecords['auth_user'] = 1;
        }
      } catch (error) {
        console.error('Auth user deletion error:', error);
        deletedRecords['auth_user'] = -1;
      }
    }

    // Mark as completed
    await supabase
      .from('data_deletion_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        deleted_records: deletedRecords
      })
      .eq('id', deletionId);

    // Log completion
    await supabase.rpc('log_auth_event', {
      user_uuid: job.user_id,
      event_type: 'gdpr_deletion_completed',
      event_data: {
        deletion_id: deletionId,
        deleted_records: deletedRecords
      }
    });

    console.log(`Deletion job ${deletionId} completed successfully`);

  } catch (error) {
    console.error('Deletion processing error:', error);
    
    // Mark as failed
    await supabase
      .from('data_deletion_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', deletionId);
  }
}

// Delete data by category with proper cascade handling
async function deleteDataCategory(userId: string, category: string): Promise<number> {
  let totalDeleted = 0;

  switch (category) {
    case 'profile':
      // Soft delete profile (keep for audit purposes)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          deleted_at: new Date().toISOString(),
          full_name: '[DELETED]',
          email: null,
          phone: null,
          bio: null,
          avatar_url: null
        })
        .eq('id', userId);
      if (!profileError) totalDeleted += 1;
      break;

    case 'posts':
      // Delete posts and their comments (cascade)
      const { data: posts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);
      
      if (posts) {
        for (const post of posts) {
          await supabase.from('comments').delete().eq('post_id', post.id);
          await supabase.from('post_reactions').delete().eq('post_id', post.id);
        }
        const { count } = await supabase
          .from('posts')
          .delete()
          .eq('user_id', userId);
        totalDeleted += count || 0;
      }
      break;

    case 'connections':
      const { count: connCount } = await supabase
        .from('connections')
        .delete()
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      totalDeleted += connCount || 0;
      break;

    case 'messages':
      // Delete conversations and messages
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      
      if (conversations) {
        for (const conv of conversations) {
          await supabase.from('messages').delete().eq('conversation_id', conv.id);
        }
        const { count } = await supabase
          .from('conversations')
          .delete()
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
        totalDeleted += count || 0;
      }
      break;

    case 'yearbook_claims':
      // Only delete user's claims, not the historical photos
      const { count: claimCount } = await supabase
        .from('claims')
        .delete()
        .eq('user_id', userId);
      
      // Remove claimed_by references but keep the face data
      await supabase
        .from('yearbook_faces')
        .update({ claimed_by: null })
        .eq('claimed_by', userId);
      
      totalDeleted += claimCount || 0;
      break;

    case 'activity_logs':
      const { count: actCount } = await supabase
        .from('activity_feed')
        .delete()
        .eq('user_id', userId);
      totalDeleted += actCount || 0;
      break;

    case 'business_listings':
      const { count: bizCount } = await supabase
        .from('business_listings')
        .delete()
        .eq('owner_id', userId);
      totalDeleted += bizCount || 0;
      break;

    case 'events':
      // Delete created events and attendance records
      const { data: userEvents } = await supabase
        .from('events')
        .select('id')
        .eq('created_by', userId);
      
      if (userEvents) {
        for (const event of userEvents) {
          await supabase.from('event_attendees').delete().eq('event_id', event.id);
        }
      }
      
      const { count: eventCount } = await supabase
        .from('events')
        .delete()
        .eq('created_by', userId);
      
      const { count: attendCount } = await supabase
        .from('event_attendees')
        .delete()
        .eq('user_id', userId);
      
      totalDeleted += (eventCount || 0) + (attendCount || 0);
      break;

    case 'preferences':
      const { count: prefCount } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId);
      totalDeleted += prefCount || 0;
      break;

    case 'auth_data':
      // Delete sessions, devices, and MFA factors
      await supabase.from('user_sessions').delete().eq('user_id', userId);
      await supabase.from('user_devices').delete().eq('user_id', userId);
      await supabase.from('mfa_factors').delete().eq('user_id', userId);
      await supabase.from('oauth_accounts').delete().eq('user_id', userId);
      totalDeleted += 1; // Approximate count
      break;

    default:
      console.warn(`Unknown deletion category: ${category}`);
      break;
  }

  return totalDeleted;
}

// Send deletion confirmation notification
async function sendDeletionConfirmationNotification(
  userId: string,
  deletionId: string,
  confirmationCode: string,
  deletionType: string
): Promise<void> {
  try {
    // Create in-app notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'gdpr_deletion_confirmation',
        title: 'Confirm Data Deletion Request',
        message: `Please confirm your ${deletionType} deletion request using code: ${confirmationCode}. This request will expire in 7 days.`,
        metadata: { 
          deletion_id: deletionId,
          confirmation_code: confirmationCode,
          deletion_type: deletionType
        },
        created_at: new Date().toISOString()
      });

    // In production, also send email
    console.log(`Deletion confirmation sent to user ${userId}: code ${confirmationCode}`);

  } catch (error) {
    console.error('Failed to send deletion confirmation:', error);
  }
}

// Check deletion status
async function checkDeletionStatus(deletionId: string, userId: string): Promise<{
  success: boolean;
  status?: DeletionJobStatus;
  message?: string;
}> {
  try {
    const { data: job, error } = await supabase
      .from('data_deletion_jobs')
      .select('*')
      .eq('id', deletionId)
      .eq('user_id', userId)
      .single();

    if (error || !job) {
      return {
        success: false,
        message: 'Deletion request not found'
      };
    }

    return {
      success: true,
      status: {
        id: job.id,
        status: job.status,
        deletion_type: job.deletion_type,
        requested_at: job.requested_at,
        confirmed_at: job.confirmed_at,
        completed_at: job.completed_at,
        expires_at: job.expires_at,
        data_categories: job.data_categories,
        reason: job.reason,
        confirmation_code: job.status === 'pending_confirmation' ? job.confirmation_code : undefined,
        error_message: job.error_message,
        deleted_records: job.deleted_records
      }
    };

  } catch (error) {
    console.error('Deletion status check error:', error);
    return {
      success: false,
      message: 'Failed to check deletion status'
    };
  }
}

// Cancel deletion request
async function cancelDeletionRequest(deletionId: string, userId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const { error } = await supabase
      .from('data_deletion_jobs')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', deletionId)
      .eq('user_id', userId)
      .in('status', ['pending_confirmation', 'confirmed']);

    if (error) {
      throw new Error(`Failed to cancel deletion: ${error.message}`);
    }

    // Log cancellation
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: 'gdpr_deletion_cancelled',
      event_data: { deletion_id: deletionId }
    });

    return {
      success: true,
      message: 'Deletion request cancelled successfully'
    };

  } catch (error) {
    console.error('Deletion cancellation error:', error);
    return {
      success: false,
      message: 'Failed to cancel deletion request'
    };
  }
}

// List user's deletion requests
async function listUserDeletions(userId: string): Promise<{
  success: boolean;
  deletions?: DeletionJobStatus[];
  message?: string;
}> {
  try {
    const { data: jobs, error } = await supabase
      .from('data_deletion_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to list deletions: ${error.message}`);
    }

    const deletions = jobs?.map(job => ({
      id: job.id,
      status: job.status,
      deletion_type: job.deletion_type,
      requested_at: job.requested_at,
      confirmed_at: job.confirmed_at,
      completed_at: job.completed_at,
      expires_at: job.expires_at,
      data_categories: job.data_categories,
      reason: job.reason,
      error_message: job.error_message,
      deleted_records: job.deleted_records
    })) || [];

    return {
      success: true,
      deletions
    };

  } catch (error) {
    console.error('Deletion listing error:', error);
    return {
      success: false,
      message: 'Failed to list deletions'
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
    const body: DataDeletionRequest = await req.json();
    let result;

    switch (body.action) {
      case 'request_deletion':
        if (!body.user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await requestDataDeletion(
          body.user_id,
          body.deletion_type || 'account',
          body.data_categories || [],
          body.reason
        );
        break;

      case 'confirm_deletion':
        if (!body.deletion_id || !body.user_id || !body.confirmation_code) {
          return new Response(
            JSON.stringify({ error: 'Deletion ID, User ID, and confirmation code are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await confirmDataDeletion(body.deletion_id, body.user_id, body.confirmation_code);
        break;

      case 'check_status':
        if (!body.deletion_id || !body.user_id) {
          return new Response(
            JSON.stringify({ error: 'Deletion ID and User ID are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await checkDeletionStatus(body.deletion_id, body.user_id);
        break;

      case 'cancel_deletion':
        if (!body.deletion_id || !body.user_id) {
          return new Response(
            JSON.stringify({ error: 'Deletion ID and User ID are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await cancelDeletionRequest(body.deletion_id, body.user_id);
        break;

      case 'list_deletions':
        if (!body.user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await listUserDeletions(body.user_id);
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
    console.error('GDPR data deletion service error:', error);
    
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