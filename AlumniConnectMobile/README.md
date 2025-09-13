# Alumni Connect Mobile App

A comprehensive React Native mobile application for alumni networking, yearbook viewing, and event management built with Expo.

## Features

- **Yearbook Reader**: Touch-optimized yearbook viewer with pinch-to-zoom, pan, and double-tap gestures
- **Push Notifications**: Real-time notifications for posts, events, messages, and connections
- **Social Networking**: Alumni connections and networking features
- **Event Management**: Create, view, and RSVP to alumni events
- **Profile Management**: Complete user profiles with privacy settings
- **Premium Features**: Subscription-based premium content and features

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router with file-based routing
- **State Management**: React Query (TanStack Query)
- **Database**: Supabase with real-time capabilities
- **Authentication**: Supabase Auth
- **Push Notifications**: Expo Notifications with backend integration
- **Testing**: Jest, React Testing Library, Detox for E2E
- **Styling**: React Native StyleSheet with Tailwind-inspired design

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open the app:
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan QR code with Expo Go app on physical device

## Development

### Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run web version
- `npm test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run E2E tests with Detox
- `npm run lint` - Run ESLint
- `npm run build:ios` - Build iOS production app
- `npm run build:android` - Build Android production app

### Project Structure

```
app/
├── (tabs)/              # Tab navigation screens
├── yearbook/[id].tsx    # Yearbook detail screen
├── profile/[id].tsx     # Profile view screen
├── event/[id].tsx       # Event detail screen
└── _layout.tsx         # Root layout with providers

components/
├── yearbook/           # Yearbook reader components
├── notifications/      # Notification components
├── ui/                # Reusable UI components
└── haptic-tab.tsx     # Haptic feedback tab component

services/
├── NotificationService.ts  # Push notification service
├── DeepLinkingService.ts   # Deep linking handling
└── supabase.ts         # Supabase client configuration

lib/
├── react-query.ts      # React Query configuration
├── supabase.ts         # Supabase client
└── types.ts            # TypeScript type definitions

__tests__/
├── components/         # Component tests
├── screens/           # Screen tests
├── unit.test.ts       # Unit tests
└── e2e/              # E2E test files
```

## Testing

### Unit Tests

Run unit tests with Jest:
```bash
npm test
```

### E2E Tests

Run E2E tests with Detox:
```bash
# Build for testing
npm run test:e2e:build

# Run tests
npm run test:e2e
```

### Test Coverage

Generate test coverage report:
```bash
npm run test:coverage
```

## Push Notifications

The app includes comprehensive push notification support:

- **Backend Integration**: Expo Push Notification API
- **Token Management**: Automatic token registration and storage
- **Notification Types**: Posts, events, messages, connection requests
- **User Preferences**: Per-user notification settings

### Database Schema

Push notifications require the `user_settings` table with:
- `expo_push_token` for device tokens
- `notification_preferences` JSONB for user preferences
- RLS policies for security

## Deployment

### Production Builds

Build production apps with EAS Build:

```bash
# iOS
npm run build:ios

# Android  
npm run build:android
```

### Web Deployment

Build and deploy web version:
```bash
npm run build:web
```

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new features
3. Update documentation for changes
4. Ensure TypeScript compilation passes
5. Run linting before committing

## License

This project is part of the Alumni Connect platform.

## Support

For support and questions, please contact the development team.