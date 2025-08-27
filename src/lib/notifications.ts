import { supabase } from "@/integrations/supabase/client";

export interface CreateNotificationData {
  user_id: string;
  type: 'friend_request' | 'friend_accepted' | 'tag_suggestion' | 'tag_verified' | 'yearbook_upload';
  title: string;
  message?: string;
  related_user_id?: string;
  related_entity_id?: string;
}

export const createNotification = async (data: CreateNotificationData) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([data]);

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

// Helper functions for common notification types
export const notifyFriendRequest = (recipientId: string, requesterId: string, requesterName: string) => {
  return createNotification({
    user_id: recipientId,
    type: 'friend_request',
    title: 'New friend request',
    message: `${requesterName} wants to connect with you`,
    related_user_id: requesterId
  });
};

export const notifyFriendAccepted = (recipientId: string, accepterId: string, accepterName: string) => {
  return createNotification({
    user_id: recipientId,
    type: 'friend_accepted',
    title: 'Friend request accepted',
    message: `${accepterName} accepted your friend request`,
    related_user_id: accepterId
  });
};

export const notifyTagSuggestion = (recipientId: string, suggestionId: string, suggesterName: string) => {
  return createNotification({
    user_id: recipientId,
    type: 'tag_suggestion',
    title: 'You\'ve been tagged in a yearbook',
    message: `${suggesterName} thinks this might be you in a yearbook photo`,
    related_entity_id: suggestionId
  });
};

export const notifyTagVerified = (recipientId: string, tagId: string, verifierName: string) => {
  return createNotification({
    user_id: recipientId,
    type: 'tag_verified',
    title: 'Tag verified',
    message: `${verifierName} confirmed your yearbook tag`,
    related_entity_id: tagId
  });
};

export const notifyYearbookUpload = (schoolId: string, uploaderName: string, yearbook: { year: number, school_name: string }) => {
  // This would notify all users from the same school
  // Implementation would require getting all user IDs from the school
  return createNotification({
    user_id: '', // This would be populated with each school member's ID
    type: 'yearbook_upload',
    title: 'New yearbook available',
    message: `${uploaderName} uploaded the ${yearbook.year} yearbook for ${yearbook.school_name}`,
    related_entity_id: schoolId
  });
};