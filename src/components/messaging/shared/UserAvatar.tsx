// Reusable user avatar component with consistent styling
import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/lib/messaging/types';
import { getInitials } from '@/lib/messaging/utils';
import { UI_CONSTANTS } from '@/lib/messaging/constants';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  user: UserProfile;
  size?: keyof typeof UI_CONSTANTS.AVATAR_SIZE;
  className?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

export const UserAvatar = memo<UserAvatarProps>(({
  user,
  size = 'medium',
  className,
  showOnlineIndicator = false,
  isOnline = false
}) => {
  const sizeClass = UI_CONSTANTS.AVATAR_SIZE[size];

  return (
    <div className="relative">
      <Avatar className={cn(sizeClass, className)}>
        <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
        <AvatarFallback className="text-xs">
          {getInitials(user.first_name, user.last_name)}
        </AvatarFallback>
      </Avatar>

      {showOnlineIndicator && (
        <div
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}
    </div>
  );
});

UserAvatar.displayName = 'UserAvatar';