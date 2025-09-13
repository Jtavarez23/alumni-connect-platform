import React, { useState } from 'react';
import { Bell, CheckCircle, Circle, Settings, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationItem } from '@/components/notifications/NotificationItem';

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'connection' as const,
      title: 'New connection request',
      message: 'John Smith wants to connect with you from Miami High Class of 2005',
      timestamp: '2 minutes ago',
      isRead: false,
      actor: {
        name: 'John Smith',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      actionUrl: '/network/requests'
    },
    {
      id: '2', 
      type: 'event' as const,
      title: 'Event reminder',
      message: 'Class of 2010 Reunion is tomorrow at 7 PM. Don\'t forget to RSVP!',
      timestamp: '1 hour ago',
      isRead: false,
      actionUrl: '/events/class-2010-reunion'
    },
    {
      id: '3',
      type: 'like' as const,
      title: 'Your post was liked',
      message: 'Sarah Johnson and 12 others liked your yearbook photo claim',
      timestamp: '3 hours ago',
      isRead: true,
      actor: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      }
    },
    {
      id: '4',
      type: 'comment' as const,
      title: 'New comment on your post',
      message: 'Mike Davis commented: "Great seeing everyone at the reunion!"',
      timestamp: '5 hours ago',
      isRead: true,
      actor: {
        name: 'Mike Davis',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      }
    },
    {
      id: '5',
      type: 'claim' as const,
      title: 'Yearbook claim approved',
      message: 'Your claim for the photo in Miami High 2005 yearbook has been verified',
      timestamp: '1 day ago',
      isRead: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const handleDismiss = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleNotificationClick = (notificationId: string) => {
    handleMarkRead(notificationId);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <AppLayout title="Notifications">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-display gradient-text">Notifications</h1>
            <p className="text-body text-muted-foreground mt-1">
              Stay connected with your alumni network
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notification Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="connections">
              Connections
            </TabsTrigger>
            <TabsTrigger value="activity">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  data={notification}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                  onClick={handleNotificationClick}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-h2 mb-2">No notifications</h3>
                <p className="text-body text-muted-foreground">
                  You're all caught up! Check back later for updates.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4 mt-6">
            {notifications.filter(n => !n.isRead).length > 0 ? (
              notifications
                .filter(n => !n.isRead)
                .map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    data={notification}
                    onMarkRead={handleMarkRead}
                    onDismiss={handleDismiss}
                    onClick={handleNotificationClick}
                  />
                ))
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-h2 mb-2">All caught up!</h3>
                <p className="text-body text-muted-foreground">
                  No unread notifications.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-4 mt-6">
            {notifications
              .filter(n => n.type === 'connection')
              .map((notification) => (
                <NotificationItem
                  key={notification.id}
                  data={notification}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                  onClick={handleNotificationClick}
                />
              ))}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-6">
            {notifications
              .filter(n => ['like', 'comment', 'share', 'event', 'claim'].includes(n.type))
              .map((notification) => (
                <NotificationItem
                  key={notification.id}
                  data={notification}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                  onClick={handleNotificationClick}
                />
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}