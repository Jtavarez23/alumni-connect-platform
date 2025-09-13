# Alumni Connect Mobile - Deployment Guide

## Overview
This document outlines the deployment process for the Alumni Connect mobile application across iOS, Android, and web platforms.

## Prerequisites

### Required Accounts
- **Expo Account**: For EAS builds and updates
- **Apple Developer Account**: For iOS App Store distribution
- **Google Play Console**: For Android distribution
- **Vercel Account**: For web deployment
- **GitHub Account**: For CI/CD workflows

### Required Secrets
Add these secrets to your GitHub repository:

```bash
# Expo
EAS_TOKEN=your-expo-eas-token

# Supabase (Production)
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase (Staging)
EXPO_PUBLIC_SUPABASE_URL_STAGING=https://your-staging-supabase-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING=your-staging-supabase-anon-key

# Vercel
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
VERCEL_PROJECT_ID_STAGING=your-vercel-staging-project-id

# Slack (Optional)
SLACK_WEBHOOK=https://hooks.slack.com/services/...
SLACK_WEBHOOK_STAGING=https://hooks.slack.com/services/...
```

## Build Commands

### Development Builds
```bash
# Start development server
npm start

# iOS simulator
expo start --ios

# Android emulator  
expo start --android

# Web browser
expo start --web
```

### Production Builds
```bash
# Pre-build checks (linting, tests, optimization)
npm run prebuild

# iOS production build
npm run build:ios

# Android production build  
npm run build:android

# Web production build
npm run build:web
```

### Staging/Preview Builds
```bash
# iOS preview build
eas build --platform ios --profile preview

# Android preview build
eas build --platform android --profile preview
```

## Deployment Workflows

### Production Deployment (main/master branch)
1. Push to main/master branch
2. GitHub Actions automatically:
   - Runs tests and linting
   - Builds iOS, Android, and web versions
   - Deploys web to Vercel
   - Creates build artifacts for app stores

### Staging Deployment (develop branch)
1. Push to develop branch  
2. GitHub Actions automatically:
   - Runs tests and linting
   - Builds staging versions
   - Deploys staging web to Vercel
   - Creates test builds for internal testing

### Manual Deployment
```bash
# Build and submit to App Store
eas build --platform ios --profile production
eas submit --platform ios

# Build and submit to Play Store
eas build --platform android --profile production  
eas submit --platform android

# Deploy web manually
npm run build:web
# Then deploy dist-web folder to your hosting service
```

## Environment Configuration

### Production Environment (.env.production)
```env
APP_ENV=production
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Staging Environment (.env.staging)
```env
APP_ENV=staging  
EXPO_PUBLIC_SUPABASE_URL=https://your-staging-supabase.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
```

## App Store Submission

### iOS App Store
1. Ensure App Store Connect setup is complete
2. Create production build: `npm run build:ios`
3. Submit build: `eas submit --platform ios`
4. Wait for Apple review

### Google Play Store
1. Ensure Play Console setup is complete  
2. Create production build: `npm run build:android`
3. Submit build: `eas submit --platform android`
4. Wait for Google review

## Monitoring and Analytics

### Build Monitoring
- Check GitHub Actions for build status
- Monitor Expo dashboard for build progress
- Set up Slack notifications for deployments

### App Performance
- Expo Application Services (EAS) provides build analytics
- Integrate Sentry for error tracking
- Use Amplitude/Mixpanel for user analytics

## Troubleshooting

### Common Issues

**Build Failing:**
- Check Node.js version (requires 18+)
- Run `npm ci --legacy-peer-deps` to clean install
- Verify all environment variables are set

**iOS Build Issues:**
- Ensure Apple Developer account is properly configured
- Check certificate and provisioning profiles

**Android Build Issues:**
- Verify keystore configuration in eas.json
- Check Google Play Console setup

**Web Build Issues:**
- Check Vercel project configuration
- Verify domain settings

### Support
- Expo Documentation: https://docs.expo.dev
- EAS Documentation: https://docs.expo.dev/eas/
- GitHub Actions Docs: https://docs.github.com/en/actions
- Vercel Documentation: https://vercel.com/docs

## Versioning Strategy

- **Major versions**: Breaking changes, new features
- **Minor versions**: Feature additions, improvements  
- **Patch versions**: Bug fixes, minor updates
- Use semantic versioning (e.g., 1.2.3)
- Auto-increment build numbers in eas.json

## Rollback Procedure

1. **Web**: Revert to previous deployment in Vercel dashboard
2. **Mobile**: Submit previous build version to app stores
3. **Database**: Use Supabase backup and restore if needed

## Security Considerations

- Keep API keys and secrets secure
- Use environment variables for configuration
- Regular dependency updates
- Security scanning in CI/CD pipeline
- App Store security reviews