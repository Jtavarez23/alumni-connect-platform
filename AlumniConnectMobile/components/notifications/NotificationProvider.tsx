/**
 * Notification Provider for Alumni Connect Mobile
 * Handles push notifications and local notifications
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import NotificationService from '../../services/NotificationService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  requestPermission: () => Promise<boolean>;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F172A',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: 'alumni-connect-mobile',
        })
      ).data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  useEffect(() => {
    const registerAndSaveToken = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        setExpoPushToken(token || null);
        
        if (token) {
          console.log('Expo push token:', token);
          // Save token to backend for user association
          const user = await supabase.auth.getUser();
          if (user.data.user) {
            await NotificationService.saveUserPushToken(user.data.user.id, token);
          }
        }
      } catch (error) {
        console.error('Error registering for push notifications:', error);
      }
    };

    registerAndSaveToken();

    // Listen for incoming notifications
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Handle notification taps
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      // Handle notification tap based on data
      if (data?.type === 'post') {
        // Navigate to post
      } else if (data?.type === 'event') {
        // Navigate to event
      } else if (data?.type === 'message') {
        // Navigate to message thread
      }
    });

    return () => {
      notificationListener?.remove();
      responseListener?.remove();
    };
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!Device.isDevice) {
      console.warn('Must use physical device for Push Notifications');
      return false;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Send immediately
    });
  };

  const value: NotificationContextType = {
    expoPushToken,
    notification,
    requestPermission,
    sendLocalNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}