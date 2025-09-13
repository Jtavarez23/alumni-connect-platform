/**
 * Notification Service - Backend Integration for Push Notifications
 * Handles sending push notifications to users via Expo Push Notifications API
 */

import { supabase } from '../lib/supabase';

export interface PushNotificationPayload {
  to: string; // Expo push token
  title: string;
  body: string;
  data?: {
    type: 'post' | 'event' | 'message' | 'connection' | 'system';
    id?: string;
    [key: string]: any;
  };
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
}

export interface NotificationRecipient {
  userId: string;
  expoPushToken: string;
}

class NotificationService {
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Send a push notification to a single user
   */
  static async sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([payload]),
      });

      if (!response.ok) {
        console.error('Failed to send push notification:', response.statusText);
        return false;
      }

      const result = await response.json();
      
      // Check if any notifications failed
      const failed = result.data?.some((item: any) => item.status === 'error');
      
      if (failed) {
        console.error('Some push notifications failed:', result.data);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendBulkPushNotifications(recipients: NotificationRecipient[], title: string, body: string, data?: any): Promise<number> {
    const payloads = recipients.map(recipient => ({
      to: recipient.expoPushToken,
      title,
      body,
      data: data || {},
      sound: 'default' as const,
    }));

    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloads),
      });

      if (!response.ok) {
        console.error('Failed to send bulk push notifications:', response.statusText);
        return 0;
      }

      const result = await response.json();
      
      // Count successful notifications
      const successful = result.data?.filter((item: any) => item.status === 'ok').length || 0;
      
      if (successful < recipients.length) {
        console.warn(`Sent ${successful}/${recipients.length} notifications successfully`);
      }

      return successful;
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
      return 0;
    }
  }

  /**
   * Get user's push token from database
   */
  static async getUserPushToken(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_push_token', { user_uuid: userId });

      if (error) {
        console.error('Error fetching user push token:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting user push token:', error);
      return null;
    }
  }

  /**
   * Save user's push token to database
   */
  static async saveUserPushToken(userId: string, expoPushToken: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('save_user_push_token', { 
          user_uuid: userId, 
          push_token: expoPushToken 
        });

      if (error) {
        console.error('Error saving push token:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error saving user push token:', error);
      return false;
    }
  }

  /**
   * Remove user's push token (on logout or notification disable)
   */
  static async removeUserPushToken(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('remove_user_push_token', { user_uuid: userId });

      if (error) {
        console.error('Error removing push token:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error removing user push token:', error);
      return false;
    }
  }

  /**
   * Send notification for new post
   */
  static async notifyNewPost(postId: string, authorName: string, contentPreview: string): Promise<boolean> {
    // TODO: Get followers of the author and send notifications
    // This would require a more complex implementation with user relationships
    console.log('New post notification:', { postId, authorName, contentPreview });
    return true;
  }

  /**
   * Send notification for new event
   */
  static async notifyNewEvent(eventId: string, eventTitle: string): Promise<boolean> {
    // TODO: Get users interested in events and send notifications
    console.log('New event notification:', { eventId, eventTitle });
    return true;
  }

  /**
   * Send notification for new message
   */
  static async notifyNewMessage(threadId: string, senderName: string, messagePreview: string): Promise<boolean> {
    // TODO: Get recipient and send notification
    console.log('New message notification:', { threadId, senderName, messagePreview });
    return true;
  }

  /**
   * Send notification for new connection request
   */
  static async notifyConnectionRequest(requesterId: string, requesterName: string): Promise<boolean> {
    // TODO: Get recipient and send notification
    console.log('Connection request notification:', { requesterId, requesterName });
    return true;
  }
}

export default NotificationService;