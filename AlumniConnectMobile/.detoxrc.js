/**
 * Detox Configuration for Alumni Connect Mobile E2E Testing
 * Google-level end-to-end testing setup for iOS, Android, and Web
 */

const { platform } = require('os');

module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupFilesAfterEnv: ['<rootDir>/e2e/setup.ts'],
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'dist-ios/AlumniConnectMobile.app',
      build: platform() === 'darwin' 
        ? 'npx expo prebuild --platform ios && npx expo run:ios --configuration Debug'
        : 'echo "iOS builds require macOS. Please run on a Mac machine." && exit 1',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'dist-ios/AlumniConnectMobile.app',
      build: platform() === 'darwin' 
        ? 'npx expo prebuild --platform ios && npx expo run:ios --configuration Release'
        : 'echo "iOS builds require macOS. Please run on a Mac machine." && exit 1',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'dist-android/app-debug.apk',
      build: 'echo "Android builds require proper setup. Use expo run:android directly for development." && exit 1',
      reversePorts: [
        8081, // Metro bundler
      ],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'dist-android/app-release.apk',
      build: 'echo "Android builds require proper setup. Use expo run:android directly for development." && exit 1',
    },
    'web.debug': {
      type: 'web',
      build: 'npx expo export:web',
      serve: 'npx serve dist/web -p 3000',
    },
  },
  devices: {
    'ios.simulator': {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
        os: 'iOS 17.0',
      },
    },
    'android.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
    'web.browser': {
      type: 'web',
      device: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'ios.simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'ios.simulator',
      app: 'ios.release',
    },
    'android.emu.debug': {
      device: 'android.emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'android.emulator',
      app: 'android.release',
    },
    'web.browser.debug': {
      device: 'web.browser',
      app: 'web.debug',
    },
  },
};