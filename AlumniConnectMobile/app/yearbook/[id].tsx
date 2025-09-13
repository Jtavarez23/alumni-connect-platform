/**
 * Yearbook Detail Screen
 * Full-screen yearbook reader with touch gestures
 * Lazy loaded for optimal bundle performance
 */

import React, { Suspense } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';

// Lazy load the heavy yearbook reader component
const TouchYearbookReader = React.lazy(() => 
  import('../../components/yearbook/TouchYearbookReader')
);

// Loading component for suspense fallback
function YearbookLoading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={{ color: '#FFFFFF', marginTop: 16 }}>Loading yearbook...</Text>
    </View>
  );
}

export default function YearbookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <Suspense fallback={<YearbookLoading />}>
      <TouchYearbookReader
        yearbookId={id}
        initialPage={1}
        onPageChange={(page) => {
          // Could implement analytics tracking here
          console.log('Page changed to:', page);
        }}
      />
    </Suspense>
  );
}