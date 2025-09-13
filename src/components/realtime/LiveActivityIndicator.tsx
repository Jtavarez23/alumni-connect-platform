import { usePresence } from '@/hooks/usePresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveActivityIndicatorProps {
  entityId?: string;
  entityType?: 'yearbook' | 'profile' | 'chat';
  className?: string;
  showDetailed?: boolean;
}

export function LiveActivityIndicator({ 
  entityId, 
  entityType = 'yearbook',
  className,
  showDetailed = false 
}: LiveActivityIndicatorProps) {
  const currentPage = window.location.pathname;
  const { onlineUsers, getUsersOnPage, loading } = usePresence();

  const currentPageUsers = getUsersOnPage(currentPage);
  const totalOnline = onlineUsers.length;

  if (loading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-6 w-20 bg-muted rounded"></div>
      </div>
    );
  }

  if (showDetailed && currentPageUsers.length > 0) {
    return (
      <Card className={cn("border border-green-200 bg-green-50/50", className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">
              {currentPageUsers.length} viewing now
            </span>
          </div>
          <div className="flex items-center gap-1">
            {currentPageUsers.slice(0, 3).map((user) => (
              <Avatar key={user.user_id} className="h-6 w-6 border-2 border-green-500">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-xs bg-green-100">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            ))}
            {currentPageUsers.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                <span className="text-xs text-green-700">+{currentPageUsers.length - 3}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {currentPageUsers.length > 0 && (
        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
          <Eye className="h-3 w-3 mr-1" />
          {currentPageUsers.length} viewing
        </Badge>
      )}
      
      {totalOnline > 0 && (
        <Badge variant="outline" className="border-blue-200 text-blue-700">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
          {totalOnline} online
        </Badge>
      )}
    </div>
  );
}