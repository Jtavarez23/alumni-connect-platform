/**
 * E2E Setup Validation Test
 * Validates that the Detox E2E testing infrastructure is properly configured
 */

describe('E2E Setup Validation', () => {
  beforeAll(async () => {
    // Skip if running on CI without emulators
    if (process.env.CI && !process.env.DETOX_EMULATOR_AVAILABLE) {
      return;
    }
    
    await device.launchApp({
      permissions: {
        camera: 'YES',
        photos: 'YES',
        notifications: 'YES',
      },
      languageAndLocale: {
        language: 'en-US',
        locale: 'en-US',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should launch the app successfully', async () => {
    // Basic test to verify app launches
    await expect(element(by.id('app-root'))).toBeVisibleOnScreen();
  });

  it('should have basic navigation elements', async () => {
    // Check for common navigation elements
    await expect(element(by.id('tab-navigator'))).toBeVisibleOnScreen();
    await expect(element(by.id('feed-tab'))).toBeVisible();
    await expect(element(by.id('yearbooks-tab'))).toBeVisible();
  });

  it('should handle device interactions', async () => {
    // Test basic device interactions
    await device.shake(); // Should trigger refresh
    await device.setOrientation('portrait');
    
    // Verify orientation change
    await expect(element(by.id('app-root'))).toBeVisibleOnScreen();
  });

  it('should handle network conditions', async () => {
    // Test offline/online simulation
    await device.setURLBlacklist(['*']); // Go offline
    await device.shake(); // Trigger refresh
    
    // Should show offline state
    await expect(element(by.text('No internet connection'))).toBeVisible();
    
    await device.setURLBlacklist([]); // Go back online
    await device.shake(); // Trigger refresh
    
    // Should recover
    await expect(element(by.id('app-root'))).toBeVisibleOnScreen();
  });
});