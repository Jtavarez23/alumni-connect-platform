// ================================================================
// ALUMNI CONNECT: GDPR DATA EXPORT SERVICE
// File: gdpr-data-export/index.ts
// Purpose: Handle GDPR-compliant data export requests for users
// ================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

interface DataExportRequest {
  action: 'request_export' | 'check_status' | 'download_export' | 'list_exports';
  user_id?: string;
  export_id?: string;
  format?: 'json' | 'csv' | 'xml';
  include_media?: boolean;
  data_categories?: string[];
}

interface ExportJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  requested_at: string;
  completed_at?: string;
  expires_at: string;
  format: string;
  include_media: boolean;
  file_size?: number;
  download_url?: string;
  error_message?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Data categories that can be exported
const DATA_CATEGORIES = {
  profile: 'User profile information',
  posts: 'Posts and comments',
  connections: 'Social connections and relationships',
  messages: 'Private messages',
  yearbook_data: 'Yearbook photos and claims',
  activity_logs: 'Activity and audit logs',
  business_listings: 'Business directory entries',
  events: 'Event participation and history',
  preferences: 'Privacy and notification preferences',
  auth_data: 'Authentication and security data'
};

// Generate secure export ID
function generateExportId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `export_${timestamp}_${randomPart}`;
}

// Request data export
async function requestDataExport(
  userId: string,
  format: string = 'json',
  includeMedia: boolean = false,
  dataCategories: string[] = Object.keys(DATA_CATEGORIES)
): Promise<{ success: boolean; export_id?: string; message?: string }> {
  try {
    // Check if user has any pending exports (limit 1 active export per user)
    const { data: pendingExports, error: checkError } = await supabase
      .from('data_export_jobs')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (checkError) {
      throw new Error(`Failed to check pending exports: ${checkError.message}`);
    }

    if (pendingExports && pendingExports.length > 0) {
      return {
        success: false,
        message: 'You already have a pending data export. Please wait for it to complete.'
      };
    }

    // Generate export job
    const exportId = generateExportId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: insertError } = await supabase
      .from('data_export_jobs')
      .insert({
        id: exportId,
        user_id: userId,
        status: 'pending',
        format,
        include_media: includeMedia,
        data_categories: dataCategories,
        expires_at: expiresAt.toISOString(),
        requested_at: new Date().toISOString()
      });

    if (insertError) {
      throw new Error(`Failed to create export job: ${insertError.message}`);
    }

    // Log the export request
    await supabase.rpc('log_auth_event', {
      user_uuid: userId,
      event_type: 'gdpr_export_requested',
      event_data: {
        export_id: exportId,
        format,
        include_media: includeMedia,
        categories: dataCategories
      }
    });

    // Trigger async export processing (in a real system, this would be a background job)
    // For now, we'll mark it as processing and simulate completion
    setTimeout(() => processExportJob(exportId), 1000);

    return {
      success: true,
      export_id: exportId,
      message: 'Data export request submitted. You will be notified when it\'s ready.'
    };

  } catch (error) {
    console.error('Data export request error:', error);
    return {
      success: false,
      message: 'Failed to request data export'
    };
  }
}

// Process export job (this would run in background in production)
async function processExportJob(exportId: string): Promise<void> {
  try {
    // Mark as processing
    await supabase
      .from('data_export_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', exportId);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('data_export_jobs')
      .select('*')
      .eq('id', exportId)
      .single();

    if (jobError || !job) {
      throw new Error('Export job not found');
    }

    // Collect user data
    const userData = await collectUserData(job.user_id, job.data_categories, job.include_media);

    // Generate export file
    const exportData = formatExportData(userData, job.format);
    const fileSize = new TextEncoder().encode(JSON.stringify(exportData)).length;

    // In production, upload to secure storage and generate signed URL
    const downloadUrl = await uploadExportFile(exportId, exportData, job.format);

    // Mark as completed
    await supabase
      .from('data_export_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        file_size: fileSize,
        download_url: downloadUrl
      })
      .eq('id', exportId);

    // Send notification to user (email, in-app notification, etc.)
    await notifyExportComplete(job.user_id, exportId);

  } catch (error) {
    console.error('Export processing error:', error);
    
    // Mark as failed
    await supabase
      .from('data_export_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', exportId);
  }
}

// Collect user data from all relevant tables
async function collectUserData(
  userId: string, 
  categories: string[], 
  includeMedia: boolean
): Promise<Record<string, any>> {
  const userData: Record<string, any> = {
    export_info: {
      user_id: userId,
      exported_at: new Date().toISOString(),
      categories_included: categories,
      media_included: includeMedia
    }
  };

  try {
    // Profile data
    if (categories.includes('profile')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      userData.profile = profile;
    }

    // Posts and comments
    if (categories.includes('posts')) {
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          *,
          comments(*)
        `)
        .eq('user_id', userId);
      
      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', userId);
      
      userData.posts = posts;
      userData.comments = comments;
    }

    // Connections
    if (categories.includes('connections')) {
      const { data: connections } = await supabase
        .from('connections')
        .select(`
          *,
          sender:profiles!connections_sender_id_fkey(full_name, email),
          receiver:profiles!connections_receiver_id_fkey(full_name, email)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      userData.connections = connections;
    }

    // Messages
    if (categories.includes('messages')) {
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          *,
          messages(*)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      userData.conversations = conversations;
    }

    // Yearbook data
    if (categories.includes('yearbook_data')) {
      const { data: claims } = await supabase
        .from('claims')
        .select('*')
        .eq('user_id', userId);
      
      const { data: yearbook_faces } = await supabase
        .from('yearbook_faces')
        .select('*')
        .eq('claimed_by', userId);
      
      userData.claims = claims;
      userData.yearbook_faces = yearbook_faces;
    }

    // Activity logs (limited to last 1 year for privacy)
    if (categories.includes('activity_logs')) {
      const { data: activities } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
      userData.activities = activities;
    }

    // Business listings
    if (categories.includes('business_listings')) {
      const { data: businesses } = await supabase
        .from('business_listings')
        .select('*')
        .eq('owner_id', userId);
      userData.businesses = businesses;
    }

    // Events
    if (categories.includes('events')) {
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', userId);
      
      const { data: attendees } = await supabase
        .from('event_attendees')
        .select(`
          *,
          event:events(title, date, location)
        `)
        .eq('user_id', userId);
      
      userData.events_created = events;
      userData.event_attendance = attendees;
    }

    // Preferences
    if (categories.includes('preferences')) {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId);
      userData.preferences = preferences;
    }

    // Auth data (limited for security)
    if (categories.includes('auth_data')) {
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('device_info, created_at, last_activity')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      
      const { data: oauth_accounts } = await supabase
        .from('oauth_accounts')
        .select('provider_name, provider_email, linked_at')
        .eq('user_id', userId);
      
      userData.recent_sessions = sessions;
      userData.oauth_accounts = oauth_accounts;
    }

    return userData;

  } catch (error) {
    console.error('Error collecting user data:', error);
    throw new Error('Failed to collect user data');
  }
}

// Format export data according to requested format
function formatExportData(data: any, format: string): any {
  switch (format) {
    case 'json':
      return data;
    
    case 'csv':
      // Convert to CSV format (simplified)
      return convertToCSV(data);
    
    case 'xml':
      // Convert to XML format (simplified)
      return convertToXML(data);
    
    default:
      return data;
  }
}

// Convert data to CSV format (simplified implementation)
function convertToCSV(data: any): string {
  // This is a simplified CSV conversion
  // In production, you'd want a more robust CSV library
  const csvLines = [];
  csvLines.push('Category,Field,Value');
  
  for (const [category, categoryData] of Object.entries(data)) {
    if (Array.isArray(categoryData)) {
      categoryData.forEach((item: any, index: number) => {
        for (const [field, value] of Object.entries(item || {})) {
          csvLines.push(`"${category}[${index}]","${field}","${JSON.stringify(value)}"`);
        }
      });
    } else if (typeof categoryData === 'object' && categoryData !== null) {
      for (const [field, value] of Object.entries(categoryData)) {
        csvLines.push(`"${category}","${field}","${JSON.stringify(value)}"`);
      }
    } else {
      csvLines.push(`"${category}","value","${JSON.stringify(categoryData)}"`);
    }
  }
  
  return csvLines.join('\n');
}

// Convert data to XML format (simplified implementation)
function convertToXML(data: any): string {
  // Simplified XML conversion
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<user_data>\n';
  
  for (const [key, value] of Object.entries(data)) {
    xml += `  <${key}>${JSON.stringify(value)}</${key}>\n`;
  }
  
  xml += '</user_data>';
  return xml;
}

// Upload export file to secure storage (mock implementation)
async function uploadExportFile(exportId: string, data: any, format: string): Promise<string> {
  // In production, this would upload to Supabase Storage or AWS S3
  // and return a signed URL with expiration
  
  const fileName = `${exportId}.${format}`;
  
  // Mock implementation - in reality, you'd upload the file
  const mockDownloadUrl = `https://example.com/exports/${fileName}`;
  
  console.log(`Export file uploaded: ${fileName}, size: ${JSON.stringify(data).length} bytes`);
  
  return mockDownloadUrl;
}

// Notify user that export is complete
async function notifyExportComplete(userId: string, exportId: string): Promise<void> {
  // In production, send email notification and/or in-app notification
  console.log(`Notifying user ${userId} that export ${exportId} is complete`);
  
  // Create in-app notification
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'gdpr_export_ready',
      title: 'Your data export is ready',
      message: `Your requested data export (${exportId}) is now available for download. The download link will expire in 7 days.`,
      metadata: { export_id: exportId },
      created_at: new Date().toISOString()
    });
}

// Check export status
async function checkExportStatus(exportId: string, userId: string): Promise<{
  success: boolean;
  status?: ExportJobStatus;
  message?: string;
}> {
  try {
    const { data: job, error } = await supabase
      .from('data_export_jobs')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', userId)
      .single();

    if (error || !job) {
      return {
        success: false,
        message: 'Export job not found'
      };
    }

    return {
      success: true,
      status: {
        id: job.id,
        status: job.status,
        requested_at: job.requested_at,
        completed_at: job.completed_at,
        expires_at: job.expires_at,
        format: job.format,
        include_media: job.include_media,
        file_size: job.file_size,
        download_url: job.status === 'completed' ? job.download_url : undefined,
        error_message: job.error_message
      }
    };

  } catch (error) {
    console.error('Export status check error:', error);
    return {
      success: false,
      message: 'Failed to check export status'
    };
  }
}

// List user's export jobs
async function listUserExports(userId: string): Promise<{
  success: boolean;
  exports?: ExportJobStatus[];
  message?: string;
}> {
  try {
    const { data: jobs, error } = await supabase
      .from('data_export_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to list exports: ${error.message}`);
    }

    const exports = jobs?.map(job => ({
      id: job.id,
      status: job.status,
      requested_at: job.requested_at,
      completed_at: job.completed_at,
      expires_at: job.expires_at,
      format: job.format,
      include_media: job.include_media,
      file_size: job.file_size,
      download_url: job.status === 'completed' ? job.download_url : undefined,
      error_message: job.error_message
    })) || [];

    return {
      success: true,
      exports
    };

  } catch (error) {
    console.error('Export listing error:', error);
    return {
      success: false,
      message: 'Failed to list exports'
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
    const body: DataExportRequest = await req.json();
    let result;

    switch (body.action) {
      case 'request_export':
        if (!body.user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await requestDataExport(
          body.user_id,
          body.format || 'json',
          body.include_media || false,
          body.data_categories || Object.keys(DATA_CATEGORIES)
        );
        break;

      case 'check_status':
        if (!body.export_id || !body.user_id) {
          return new Response(
            JSON.stringify({ error: 'Export ID and User ID are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await checkExportStatus(body.export_id, body.user_id);
        break;

      case 'list_exports':
        if (!body.user_id) {
          return new Response(
            JSON.stringify({ error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
          );
        }

        result = await listUserExports(body.user_id);
        break;

      case 'download_export':
        // This would typically redirect to the signed download URL
        // or stream the file directly
        return new Response(
          JSON.stringify({ error: 'Direct download not implemented in demo' }),
          { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        );

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
    console.error('GDPR data export service error:', error);
    
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