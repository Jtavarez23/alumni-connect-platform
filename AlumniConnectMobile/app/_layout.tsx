/**
 * Root Layout for Alumni Connect Mobile App
 * Provides global providers and authentication flow
 */

import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { queryClient, initializeFocusManager, cleanupFocusManager } from '../lib/react-query';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Load custom fonts for consistent design with web app
 */
async function loadFonts() {
  try {
    await Font.loadAsync({
      // Add custom fonts here if needed
      // 'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    });
  } catch (error) {
    console.warn('Font loading failed:', error);
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize React Query focus manager
        initializeFocusManager();

        // Load fonts and other resources
        await loadFonts();
      } catch (e) {
        console.warn('App preparation error:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    // Cleanup on unmount
    return () => {
      cleanupFocusManager();
    };
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
              }}
            >
              {/* Main Tab Navigation */}
              <Stack.Screen 
                name="(tabs)" 
                options={{ headerShown: false }} 
              />
              
              {/* Modal Screens */}
              <Stack.Screen 
                name="modal" 
                options={{ 
                  presentation: 'modal', 
                  title: 'Modal',
                  headerShown: true,
                }} 
              />
              
              {/* Yearbook Reader */}
              <Stack.Screen
                name="yearbook/[id]"
                options={{
                  presentation: 'fullScreenModal',
                  headerShown: true,
                  headerTitle: 'Yearbook',
                  headerBackTitle: 'Back',
                }}
              />
              
              {/* Profile View */}
              <Stack.Screen
                name="profile/[id]"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Profile',
                }}
              />
              
              {/* Event Details */}
              <Stack.Screen
                name="event/[id]"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Event',
                }}
              />
              
              {/* Premium Subscription */}
              <Stack.Screen
                name="subscription"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Premium',
                }}
              />
              
              {/* Settings */}
              <Stack.Screen
                name="settings"
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Settings',
                }}
              />
            </Stack>
            
            <StatusBar style="auto" />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
