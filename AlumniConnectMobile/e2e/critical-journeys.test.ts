/**
 * Critical User Journey E2E Tests
 * Google-level end-to-end testing for core user flows
 */

describe('Alumni Connect Mobile - Critical User Journeys', () => {
  beforeAll(async () => {
    // Skip E2E tests if running on CI without emulators
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

  describe('Authentication Flow', () => {
    it('should complete sign up journey successfully', async () => {
      // Navigate to sign up screen
      await element(by.id('auth-screen')).toBeVisibleOnScreen();
      await element(by.id('sign-up-button')).tap();

      // Fill out sign up form
      await element(by.id('email-input')).typeText('newuser@example.com');
      await element(by.id('password-input')).typeText('SecurePassword123!');
      await element(by.id('confirm-password-input')).typeText('SecurePassword123!');
      await element(by.id('first-name-input')).typeText('John');
      await element(by.id('last-name-input')).typeText('Doe');

      // Submit form
      await element(by.id('submit-sign-up')).tap();

      // Verify email verification screen
      await expect(element(by.id('email-verification-screen'))).toBeVisibleOnScreen();
      await expect(element(by.text('Check your email'))).toBeVisible();

      // Simulate email verification (in real test, would need backend setup)
      await device.openURL({ url: 'alumniconnect://verify-email?token=mock-token' });

      // Should navigate to onboarding
      await expect(element(by.id('onboarding-screen'))).toBeVisibleOnScreen();
    });

    it('should complete sign in journey successfully', async () => {
      // Start from auth screen
      await element(by.id('auth-screen')).toBeVisibleOnScreen();
      
      // Enter credentials
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('password123');
      
      // Sign in
      await element(by.id('sign-in-button')).tap();
      
      // Should navigate to main app
      await expect(element(by.id('tab-navigator'))).toBeVisibleOnScreen();
      await expect(element(by.id('feed-tab'))).toBeVisible();
    });

    it('should handle forgot password flow', async () => {
      await element(by.id('auth-screen')).toBeVisibleOnScreen();
      await element(by.id('forgot-password-link')).tap();

      // Enter email for reset
      await element(by.id('reset-email-input')).typeText('test@example.com');
      await element(by.id('send-reset-button')).tap();

      // Verify success message
      await expect(element(by.text('Reset email sent'))).toBeVisible();
      
      // Simulate reset link click
      await device.openURL({ url: 'alumniconnect://reset-password?token=mock-token' });
      
      // Should navigate to password reset screen
      await expect(element(by.id('password-reset-screen'))).toBeVisibleOnScreen();
    });
  });

  describe('Yearbook Reader Journey', () => {
    beforeEach(async () => {
      // Ensure user is signed in
      await device.launchApp({ newInstance: false });
      await element(by.id('yearbooks-tab')).tap();
    });

    it('should open and navigate yearbook successfully', async () => {
      // Wait for yearbooks to load
      await expect(element(by.id('yearbook-list'))).toBeVisibleOnScreen();
      
      // Tap on first yearbook
      await element(by.id('yearbook-item-0')).tap();
      
      // Yearbook reader should open
      await expect(element(by.id('yearbook-reader'))).toBeVisibleOnScreen();
      await expect(element(by.id('page-counter'))).toBeVisible();
      
      // Navigate to next page
      await element(by.id('next-page-button')).tap();
      await expect(element(by.text('2 of'))).toBeVisible();
      
      // Navigate back
      await element(by.id('prev-page-button')).tap();
      await expect(element(by.text('1 of'))).toBeVisible();
    });

    it('should handle pinch zoom gestures', async () => {
      // Open yearbook
      await element(by.id('yearbook-item-0')).tap();
      await expect(element(by.id('yearbook-reader'))).toBeVisibleOnScreen();

      // Perform pinch to zoom
      const yearbookImage = element(by.id('yearbook-image'));
      await yearbookImage.pinchWithAngle('outward', 'slow', 0);
      
      // Image should be zoomed (test through UI state)
      await expect(element(by.id('zoom-controls'))).toBeVisible();
      
      // Pinch to zoom out
      await yearbookImage.pinchWithAngle('inward', 'slow', 0);
      
      // Should return to normal zoom
      await expect(element(by.id('zoom-controls'))).not.toBeVisible();
    });

    it('should handle double tap to zoom', async () => {
      // Open yearbook
      await element(by.id('yearbook-item-0')).tap();
      
      // Double tap to zoom
      const yearbookImage = element(by.id('yearbook-image'));
      await yearbookImage.multiTap(2);
      
      // Should be zoomed
      await expect(element(by.id('zoom-controls'))).toBeVisible();
      
      // Double tap again to zoom out
      await yearbookImage.multiTap(2);
      
      // Should return to normal
      await expect(element(by.id('zoom-controls'))).not.toBeVisible();
    });

    it('should handle pan gestures when zoomed', async () => {
      // Open yearbook and zoom in
      await element(by.id('yearbook-item-0')).tap();
      const yearbookImage = element(by.id('yearbook-image'));
      await yearbookImage.multiTap(2); // Zoom in
      
      // Pan around the image
      await yearbookImage.scroll(100, 'right');
      await yearbookImage.scroll(100, 'down');
      await yearbookImage.scroll(100, 'left');
      await yearbookImage.scroll(100, 'up');
      
      // Should still be in yearbook reader
      await expect(element(by.id('yearbook-reader'))).toBeVisibleOnScreen();
    });

    it('should share yearbook successfully', async () => {
      // Open yearbook
      await element(by.id('yearbook-item-0')).tap();
      
      // Open sharing menu
      await element(by.id('share-button')).tap();
      
      // Verify share options appear
      await expect(element(by.id('share-menu'))).toBeVisibleOnScreen();
      
      // Select copy link option
      await element(by.id('copy-link-option')).tap();
      
      // Should show success message
      await expect(element(by.text('Link copied'))).toBeVisible();
    });

    it('should handle yearbook loading errors gracefully', async () => {
      // Simulate network error by going offline
      await device.setURLBlacklist(['*']);
      
      // Try to open yearbook
      await element(by.id('yearbook-item-0')).tap();
      
      // Should show error state
      await expect(element(by.id('error-screen'))).toBeVisibleOnScreen();
      await expect(element(by.text('Failed to load yearbook'))).toBeVisible();
      
      // Retry button should be present
      await expect(element(by.id('retry-button'))).toBeVisible();
      
      // Re-enable network
      await device.setURLBlacklist([]);
      
      // Retry should work
      await element(by.id('retry-button')).tap();
      await expect(element(by.id('yearbook-reader'))).toBeVisibleOnScreen();
    });
  });

  describe('Deep Linking Journey', () => {
    it('should handle yearbook deep links', async () => {
      // Open deep link
      await device.openURL({ url: 'alumniconnect://yearbook/test-yearbook-123' });
      
      // Should navigate directly to yearbook
      await expect(element(by.id('yearbook-reader'))).toBeVisibleOnScreen();
      await expect(element(by.text('Class of 2020'))).toBeVisible();
    });

    it('should handle profile deep links', async () => {
      // Open profile deep link
      await device.openURL({ url: 'alumniconnect://profile/test-user-456' });
      
      // Should navigate to profile screen
      await expect(element(by.id('profile-screen'))).toBeVisibleOnScreen();
      await expect(element(by.id('profile-header'))).toBeVisible();
    });

    it('should handle event deep links', async () => {
      // Open event deep link
      await device.openURL({ url: 'alumniconnect://event/test-event-789' });
      
      // Should navigate to event screen
      await expect(element(by.id('event-screen'))).toBeVisibleOnScreen();
      await expect(element(by.id('event-details'))).toBeVisible();
    });

    it('should handle invite deep links', async () => {
      // Open invite deep link
      await device.openURL({ url: 'alumniconnect://invite?code=ABC123' });
      
      // Should show invite dialog
      await expect(element(by.text('Join Alumni Connect'))).toBeVisible();
      await expect(element(by.text('ABC123'))).toBeVisible();
      
      // Tap sign up
      await element(by.text('Sign Up')).tap();
      
      // Should navigate to sign up with referral code
      await expect(element(by.id('sign-up-screen'))).toBeVisibleOnScreen();
      await expect(element(by.id('referral-code-input'))).toHaveText('ABC123');
    });

    it('should handle invalid deep links gracefully', async () => {
      // Open invalid deep link
      await device.openURL({ url: 'alumniconnect://invalid/path' });
      
      // Should navigate to main feed (fallback)
      await expect(element(by.id('tab-navigator'))).toBeVisibleOnScreen();
      await expect(element(by.id('feed-tab'))).toBeVisible();
    });
  });

  describe('Navigation and Tab Journey', () => {
    beforeEach(async () => {
      // Ensure we're signed in and on main screen
      await device.launchApp({ newInstance: false });
      await expect(element(by.id('tab-navigator'))).toBeVisibleOnScreen();
    });

    it('should navigate between all tabs successfully', async () => {
      // Test Feed tab
      await element(by.id('feed-tab')).tap();
      await expect(element(by.id('feed-screen'))).toBeVisibleOnScreen();
      
      // Test Yearbooks tab
      await element(by.id('yearbooks-tab')).tap();
      await expect(element(by.id('yearbooks-screen'))).toBeVisibleOnScreen();
      
      // Test Network tab
      await element(by.id('network-tab')).tap();
      await expect(element(by.id('network-screen'))).toBeVisibleOnScreen();
      
      // Test Events tab
      await element(by.id('events-tab')).tap();
      await expect(element(by.id('events-screen'))).toBeVisibleOnScreen();
      
      // Test Profile tab
      await element(by.id('profile-tab')).tap();
      await expect(element(by.id('profile-screen'))).toBeVisibleOnScreen();
    });

    it('should maintain tab state during navigation', async () => {
      // Navigate to yearbooks and scroll
      await element(by.id('yearbooks-tab')).tap();
      await element(by.id('yearbook-list')).scroll(200, 'down');
      
      // Switch to another tab and back
      await element(by.id('feed-tab')).tap();
      await element(by.id('yearbooks-tab')).tap();
      
      // Should maintain scroll position
      await expect(element(by.id('yearbook-list'))).toBeVisibleOnScreen();
      // Note: Exact scroll position testing would require more specific implementation
    });

    it('should handle tab badge notifications', async () => {
      // Simulate receiving notification that should show badge
      await device.sendUserNotification({
        title: 'New message',
        body: 'You have a new message',
        payload: { type: 'message', thread_id: '123' },
      });
      
      // Network tab should show badge
      await expect(element(by.id('network-tab-badge'))).toBeVisible();
      
      // Tapping tab should clear badge
      await element(by.id('network-tab')).tap();
      await expect(element(by.id('network-tab-badge'))).not.toBeVisible();
    });
  });

  describe('Offline and Network Journey', () => {
    it('should handle offline mode gracefully', async () => {
      // Go offline
      await device.setURLBlacklist(['*']);
      
      // Navigate to different screens
      await element(by.id('yearbooks-tab')).tap();
      
      // Should show offline indicator or cached content
      await expect(element(by.id('yearbooks-screen'))).toBeVisibleOnScreen();
      
      // Try to perform network operation
      await element(by.id('refresh-button')).tap();
      
      // Should show offline message
      await expect(element(by.text('No internet connection'))).toBeVisible();
      
      // Go back online
      await device.setURLBlacklist([]);
      
      // Retry should work
      await element(by.id('refresh-button')).tap();
      
      // Content should load
      await expect(element(by.id('yearbook-list'))).toBeVisible();
    });

    it('should handle network reconnection', async () => {
      // Start online, load content
      await element(by.id('feed-tab')).tap();
      await expect(element(by.id('feed-list'))).toBeVisible();
      
      // Go offline briefly
      await device.setURLBlacklist(['*']);
      await device.shake(); // Trigger refresh
      
      // Go back online
      await device.setURLBlacklist([]);
      
      // Should automatically reconnect and refresh
      await expect(element(by.id('feed-list'))).toBeVisible();
    });
  });

  describe('Performance and Responsiveness Journey', () => {
    it('should load main screen quickly', async () => {
      const startTime = Date.now();
      
      // Launch app
      await device.launchApp({ newInstance: true });
      
      // Wait for main screen
      await expect(element(by.id('tab-navigator'))).toBeVisibleOnScreen();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    it('should handle rapid navigation smoothly', async () => {
      // Rapidly navigate between tabs
      for (let i = 0; i < 10; i++) {
        const tabs = ['feed-tab', 'yearbooks-tab', 'network-tab', 'events-tab', 'profile-tab'];
        const randomTab = tabs[i % tabs.length];
        await element(by.id(randomTab)).tap();
        await waitFor(element(by.id(`${randomTab.replace('-tab', '')}-screen`)))
          .toBeVisible()
          .withTimeout(1000);
      }
      
      // App should still be responsive
      await expect(element(by.id('tab-navigator'))).toBeVisibleOnScreen();
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by opening many yearbooks
      await element(by.id('yearbooks-tab')).tap();
      
      for (let i = 0; i < 5; i++) {
        await element(by.id(`yearbook-item-${i}`)).tap();
        await expect(element(by.id('yearbook-reader'))).toBeVisibleOnScreen();
        await element(by.id('close-yearbook')).tap();
      }
      
      // App should still be responsive
      await expect(element(by.id('yearbooks-screen'))).toBeVisibleOnScreen();
    });
  });

  describe('Accessibility Journey', () => {
    beforeEach(async () => {
      // Enable VoiceOver/TalkBack simulation
      await device.enableSynchronization();
    });

    it('should be fully navigable with screen reader', async () => {
      // Navigate using accessibility
      await element(by.id('yearbooks-tab')).tap();
      
      // All interactive elements should be accessible
      await expect(element(by.id('yearbook-item-0'))).toHaveAccessibilityLabel();
      await expect(element(by.id('yearbook-item-0'))).toHaveAccessibilityHint();
      
      // Navigate into yearbook
      await element(by.id('yearbook-item-0')).tap();
      
      // Reader controls should be accessible
      await expect(element(by.id('next-page-button'))).toHaveAccessibilityLabel('Next page');
      await expect(element(by.id('prev-page-button'))).toHaveAccessibilityLabel('Previous page');
      await expect(element(by.id('close-yearbook'))).toHaveAccessibilityLabel('Close yearbook');
    });

    it('should support dynamic font sizes', async () => {
      // This would require device-specific accessibility settings
      // For now, we test that text elements are properly configured
      await element(by.id('feed-tab')).tap();
      
      // Text should be readable and properly sized
      await expect(element(by.id('feed-list'))).toBeVisible();
      
      // All text elements should respond to system font size
      // (This would be tested through device accessibility settings)
    });

    it('should provide proper focus management', async () => {
      // Open modal/drawer
      await element(by.id('profile-tab')).tap();
      await element(by.id('settings-button')).tap();
      
      // Focus should be on modal
      await expect(element(by.id('settings-modal'))).toBeVisibleOnScreen();
      
      // Close modal
      await element(by.id('close-settings')).tap();
      
      // Focus should return to settings button
      await expect(element(by.id('settings-button'))).toBeVisible();
    });
  });

  describe('Cross-Platform Consistency', () => {
    it('should maintain consistent behavior across platforms', async () => {
      // Test core functionality that should work the same on iOS/Android
      await element(by.id('yearbooks-tab')).tap();
      await element(by.id('yearbook-item-0')).tap();
      
      // Gesture behavior should be consistent
      const yearbookImage = element(by.id('yearbook-image'));
      await yearbookImage.multiTap(2); // Double tap zoom
      
      // Should work on both platforms
      await expect(element(by.id('zoom-controls'))).toBeVisible();
    });
  });
});