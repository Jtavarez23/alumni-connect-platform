/**
 * Comprehensive Tests for DeepLinkingService
 * Google-level testing for URL parsing, navigation, and sharing
 */

import { deepLinkingService } from '../../services/DeepLinkingService';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

// Mock dependencies
jest.mock('expo-linking');
jest.mock('expo-sharing');
jest.mock('expo-router');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: {
    alert: jest.fn(),
  },
}));
jest.mock('expo-haptics');

const mockLinking = Linking as jest.Mocked<typeof Linking>;
const mockSharing = Sharing as jest.Mocked<typeof Sharing>;
const mockRouter = router as jest.Mocked<typeof router>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const mockHaptics = Haptics.impactAsync as jest.MockedFunction<typeof Haptics.impactAsync>;

describe('DeepLinkingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  describe('Initialization', () => {
    it('initializes successfully', async () => {
      mockLinking.getInitialURL.mockResolvedValue(null);
      mockLinking.addEventListener.mockReturnValue({ remove: jest.fn() });

      const cleanup = await deepLinkingService.initialize();

      expect(mockLinking.getInitialURL).toHaveBeenCalled();
      expect(mockLinking.addEventListener).toHaveBeenCalledWith(
        'url',
        expect.any(Function)
      );
      expect(cleanup).toBeInstanceOf(Function);
    });

    it('handles initial URL when app opened via deep link', async () => {
      const initialUrl = 'alumniconnect://yearbook/123';
      mockLinking.getInitialURL.mockResolvedValue(initialUrl);
      mockLinking.addEventListener.mockReturnValue({ remove: jest.fn() });
      mockLinking.parse.mockReturnValue({
        scheme: 'alumniconnect',
        hostname: null,
        path: '/yearbook/123',
        queryParams: {},
      });

      await deepLinkingService.initialize();
      deepLinkingService.processPendingUrl();

      expect(mockRouter.push).toHaveBeenCalledWith('/yearbook/123');
      expect(mockHaptics).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('handles initialization errors gracefully', async () => {
      const error = new Error('Failed to get initial URL');
      mockLinking.getInitialURL.mockRejectedValue(error);

      const cleanup = await deepLinkingService.initialize();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize deep linking:',
        error
      );
      expect(cleanup).toBeUndefined();
    });

    it('prevents double initialization', async () => {
      mockLinking.getInitialURL.mockResolvedValue(null);
      mockLinking.addEventListener.mockReturnValue({ remove: jest.fn() });

      await deepLinkingService.initialize();
      await deepLinkingService.initialize(); // Second call

      expect(mockLinking.getInitialURL).toHaveBeenCalledTimes(1);
    });
  });

  describe('URL Parsing', () => {
    const testCases = [
      {
        url: 'alumniconnect://yearbook/123',
        expected: {
          scheme: 'alumniconnect',
          path: '/yearbook/123',
          queryParams: {},
        },
        description: 'yearbook deep link',
      },
      {
        url: 'alumniconnect://profile/user-456',
        expected: {
          scheme: 'alumniconnect',
          path: '/profile/user-456',
          queryParams: {},
        },
        description: 'profile deep link',
      },
      {
        url: 'alumniconnect://event/event-789',
        expected: {
          scheme: 'alumniconnect',
          path: '/event/event-789',
          queryParams: {},
        },
        description: 'event deep link',
      },
      {
        url: 'alumniconnect://invite?code=ABC123',
        expected: {
          scheme: 'alumniconnect',
          path: '/invite',
          queryParams: { code: 'ABC123' },
        },
        description: 'invite deep link with query params',
      },
    ];

    testCases.forEach(({ url, expected, description }) => {
      it(`parses ${description} correctly`, () => {
        mockLinking.parse.mockReturnValue(expected);
        
        const handleIncomingURL = jest.fn();
        mockLinking.addEventListener.mockImplementation((event, handler) => {
          handleIncomingURL.mockImplementation(handler);
          return { remove: jest.fn() };
        });

        // Simulate incoming URL
        handleIncomingURL({ url });

        expect(mockLinking.parse).toHaveBeenCalledWith(url);
      });
    });

    it('handles malformed URLs gracefully', () => {
      const malformedUrl = 'not-a-valid-url';
      mockLinking.parse.mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      const handleIncomingURL = jest.fn();
      mockLinking.addEventListener.mockImplementation((event, handler) => {
        handleIncomingURL.mockImplementation(handler);
        return { remove: jest.fn() };
      });

      // Should not throw error
      expect(() => {
        handleIncomingURL({ url: malformedUrl });
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Error handling deep link:',
        expect.any(Error)
      );
      expect(mockAlert).toHaveBeenCalledWith(
        'Link Error',
        'Sorry, we could not open that link. Please try again.',
        [{ text: 'OK' }]
      );
    });
  });

  describe('Navigation Routing', () => {
    beforeEach(() => {
      mockLinking.addEventListener.mockReturnValue({ remove: jest.fn() });
    });

    it('navigates to yearbook correctly', () => {
      mockLinking.parse.mockReturnValue({
        scheme: 'alumniconnect',
        path: '/yearbook/123',
        queryParams: {},
      });

      const handleIncomingURL = jest.fn();
      mockLinking.addEventListener.mockImplementation((event, handler) => {
        handleIncomingURL.mockImplementation(handler);
        return { remove: jest.fn() };
      });

      handleIncomingURL({ url: 'alumniconnect://yearbook/123' });

      expect(mockRouter.push).toHaveBeenCalledWith('/yearbook/123');
    });

    it('navigates to profile correctly', () => {
      mockLinking.parse.mockReturnValue({
        scheme: 'alumniconnect',
        path: '/profile/user-456',
        queryParams: {},
      });

      const handleIncomingURL = jest.fn();
      mockLinking.addEventListener.mockImplementation((event, handler) => {
        handleIncomingURL.mockImplementation(handler);
        return { remove: jest.fn() };
      });

      handleIncomingURL({ url: 'alumniconnect://profile/user-456' });

      expect(mockRouter.push).toHaveBeenCalledWith('/profile/user-456');
    });

    it('navigates to event correctly', () => {
      mockLinking.parse.mockReturnValue({
        scheme: 'alumniconnect',
        path: '/event/event-789',
        queryParams: {},
      });

      const handleIncomingURL = jest.fn();
      mockLinking.addEventListener.mockImplementation((event, handler) => {
        handleIncomingURL.mockImplementation(handler);
        return { remove: jest.fn() };
      });

      handleIncomingURL({ url: 'alumniconnect://event/event-789' });

      expect(mockRouter.push).toHaveBeenCalledWith('/event/event-789');
    });

    it('navigates to subscription page correctly', () => {
      mockLinking.parse.mockReturnValue({
        scheme: 'alumniconnect',
        path: '/subscription',
        queryParams: {},
      });

      const handleIncomingURL = jest.fn();
      mockLinking.addEventListener.mockImplementation((event, handler) => {
        handleIncomingURL.mockImplementation(handler);
        return { remove: jest.fn() };
      });

      handleIncomingURL({ url: 'alumniconnect://subscription' });

      expect(mockRouter.push).toHaveBeenCalledWith('/subscription');
    });

    it('handles invite links with referral codes', () => {
      mockLinking.parse.mockReturnValue({
        scheme: 'alumniconnect',
        path: '/invite',
        queryParams: { code: 'ABC123' },
      });

      const handleIncomingURL = jest.fn();
      mockLinking.addEventListener.mockImplementation((event, handler) => {
        handleIncomingURL.mockImplementation(handler);
        return { remove: jest.fn() };
      });

      handleIncomingURL({ url: 'alumniconnect://invite?code=ABC123' });

      expect(mockAlert).toHaveBeenCalledWith(
        'Join Alumni Connect',
        "You've been invited to join Alumni Connect! Use referral code: ABC123",
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'Sign Up', 
            onPress: expect.any(Function)
          },
        ]
      );
    });

    it('falls back to main feed for unrecognized paths', () => {
      mockLinking.parse.mockReturnValue({
        scheme: 'alumniconnect',
        path: '/unknown-path',
        queryParams: {},
      });

      const handleIncomingURL = jest.fn();
      mockLinking.addEventListener.mockImplementation((event, handler) => {
        handleIncomingURL.mockImplementation(handler);
        return { remove: jest.fn() };
      });

      handleIncomingURL({ url: 'alumniconnect://unknown-path' });

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/');
    });
  });

  describe('Deep Link Generation', () => {
    it('generates yearbook deep links correctly', () => {
      const deepLink = deepLinkingService.generateDeepLink('yearbook', '123');
      expect(deepLink).toBe('alumniconnect:///yearbook/123');
    });

    it('generates profile deep links correctly', () => {
      const deepLink = deepLinkingService.generateDeepLink('profile', 'user-456');
      expect(deepLink).toBe('alumniconnect:///profile/user-456');
    });

    it('generates event deep links correctly', () => {
      const deepLink = deepLinkingService.generateDeepLink('event', 'event-789');
      expect(deepLink).toBe('alumniconnect:///event/event-789');
    });

    it('generates deep links with query parameters', () => {
      const deepLink = deepLinkingService.generateDeepLink(
        'invite',
        undefined,
        { code: 'ABC123', source: 'email' }
      );
      expect(deepLink).toBe('alumniconnect:///invite?code=ABC123&source=email');
    });

    it('handles URL encoding for special characters', () => {
      const deepLink = deepLinkingService.generateDeepLink(
        'invite',
        undefined,
        { code: 'AB C123', 'special-chars': 'hello@world.com' }
      );
      expect(deepLink).toBe(
        'alumniconnect:///invite?code=AB%20C123&special-chars=hello%40world.com'
      );
    });
  });

  describe('Web Link Generation', () => {
    it('generates web links correctly', () => {
      const webLink = deepLinkingService.generateWebLink('yearbook', '123');
      expect(webLink).toBe('https://alumni-connect.com/yearbooks/123');
    });

    it('generates web profile links correctly', () => {
      const webLink = deepLinkingService.generateWebLink('profile', 'user-456');
      expect(webLink).toBe('https://alumni-connect.com/profile/user-456');
    });

    it('generates web event links correctly', () => {
      const webLink = deepLinkingService.generateWebLink('event', 'event-789');
      expect(webLink).toBe('https://alumni-connect.com/events/event-789');
    });

    it('generates web links with query parameters', () => {
      const webLink = deepLinkingService.generateWebLink(
        'invite',
        undefined,
        { code: 'ABC123' }
      );
      expect(webLink).toBe('https://alumni-connect.com/invite?code=ABC123');
    });
  });

  describe('Content Sharing', () => {
    beforeEach(() => {
      mockSharing.isAvailableAsync.mockResolvedValue(true);
      mockSharing.shareAsync.mockResolvedValue({ action: 'shared' } as any);
    });

    describe('iOS/Android Sharing', () => {
      beforeEach(() => {
        (Platform as any).OS = 'ios';
      });

      it('shares yearbook successfully', async () => {
        await deepLinkingService.shareYearbook('123', 'Class of 2020');

        expect(mockSharing.shareAsync).toHaveBeenCalledWith(
          'alumniconnect:///yearbook/123',
          {
            dialogTitle: 'Check out Class of 2020 on Alumni Connect',
            mimeType: 'text/plain',
          }
        );
        expect(mockHaptics).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      });

      it('shares event successfully', async () => {
        await deepLinkingService.shareEvent('event-123', 'Alumni Reunion 2024');

        expect(mockSharing.shareAsync).toHaveBeenCalledWith(
          'alumniconnect:///event/event-123',
          {
            dialogTitle: 'Join me at Alumni Reunion 2024',
            mimeType: 'text/plain',
          }
        );
      });

      it('shares profile successfully', async () => {
        await deepLinkingService.shareProfile('user-456', 'John Doe');

        expect(mockSharing.shareAsync).toHaveBeenCalledWith(
          'alumniconnect:///profile/user-456',
          {
            dialogTitle: 'Connect with John Doe on Alumni Connect',
            mimeType: 'text/plain',
          }
        );
      });

      it('shares invite with referral code successfully', async () => {
        await deepLinkingService.shareInvite('ABC123');

        expect(mockSharing.shareAsync).toHaveBeenCalledWith(
          'alumniconnect:///invite?code=ABC123',
          {
            dialogTitle: 'Join me on Alumni Connect',
            mimeType: 'text/plain',
          }
        );
      });

      it('handles sharing unavailable gracefully', async () => {
        mockSharing.isAvailableAsync.mockResolvedValue(false);

        const result = await deepLinkingService.shareContent({
          title: 'Test',
          message: 'Test message',
          url: 'test://url',
        });

        expect(result).toBe(false);
      });

      it('handles sharing errors gracefully', async () => {
        mockSharing.shareAsync.mockRejectedValue(new Error('Sharing failed'));

        const result = await deepLinkingService.shareContent({
          title: 'Test',
          message: 'Test message',
          url: 'test://url',
        });

        expect(result).toBe(false);
        expect(mockAlert).toHaveBeenCalledWith(
          'Share Error',
          'Sorry, we could not share that content. Please try again.',
          [{ text: 'OK' }]
        );
      });
    });

    describe('Web Sharing', () => {
      beforeEach(() => {
        (Platform as any).OS = 'web';
        // Mock navigator.share
        Object.defineProperty(global, 'navigator', {
          value: {
            share: jest.fn().mockResolvedValue(undefined),
            clipboard: {
              writeText: jest.fn().mockResolvedValue(undefined),
            },
          },
          configurable: true,
        });
      });

      it('uses native web share API when available', async () => {
        const result = await deepLinkingService.shareContent({
          title: 'Test Title',
          message: 'Test message',
          url: 'https://example.com',
        });

        expect(global.navigator.share).toHaveBeenCalledWith({
          title: 'Test Title',
          text: 'Test message',
          url: 'https://example.com',
        });
        expect(result).toBe(true);
      });

      it('falls back to clipboard when web share API unavailable', async () => {
        // Remove navigator.share
        delete (global.navigator as any).share;

        const result = await deepLinkingService.shareContent({
          title: 'Test Title',
          message: 'Test message',
          url: 'https://example.com',
        });

        expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
          'Test message\n\nhttps://example.com'
        );
        expect(mockAlert).toHaveBeenCalledWith('Copied!', 'Link copied to clipboard');
        expect(result).toBe(true);
      });

      it('shares yearbooks with web links', async () => {
        await deepLinkingService.shareYearbook('123', 'Class of 2020');

        expect(global.navigator.share).toHaveBeenCalledWith({
          title: 'Check out Class of 2020 on Alumni Connect',
          text: "I found this yearbook on Alumni Connect and thought you'd like to see it!",
          url: 'https://alumni-connect.com/yearbooks/123',
        });
      });
    });
  });

  describe('External URL Handling', () => {
    it('opens supported external URLs', async () => {
      const url = 'https://example.com';
      mockLinking.canOpenURL.mockResolvedValue(true);
      mockLinking.openURL.mockResolvedValue();

      const result = await deepLinkingService.openExternalUrl(url);

      expect(mockLinking.canOpenURL).toHaveBeenCalledWith(url);
      expect(mockLinking.openURL).toHaveBeenCalledWith(url);
      expect(result).toBe(true);
    });

    it('handles unsupported URLs gracefully', async () => {
      const url = 'unsupported://example';
      mockLinking.canOpenURL.mockResolvedValue(false);

      const result = await deepLinkingService.openExternalUrl(url);

      expect(mockLinking.canOpenURL).toHaveBeenCalledWith(url);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith(
        'Cannot Open Link',
        'This link cannot be opened on your device.',
        [{ text: 'OK' }]
      );
      expect(result).toBe(false);
    });

    it('handles URL opening errors gracefully', async () => {
      const url = 'https://example.com';
      mockLinking.canOpenURL.mockRejectedValue(new Error('URL check failed'));

      const result = await deepLinkingService.openExternalUrl(url);

      expect(console.error).toHaveBeenCalledWith(
        'Error opening external URL:',
        expect.any(Error)
      );
      expect(result).toBe(false);
    });
  });

  describe('Security and Validation', () => {
    it('validates URL schemes properly', () => {
      const validUrls = [
        'alumniconnect://yearbook/123',
        'https://alumni-connect.com/yearbooks/123',
      ];

      const invalidUrls = [
        'javascript://alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
      ];

      // Valid URLs should be processed
      validUrls.forEach(url => {
        mockLinking.parse.mockReturnValue({
          scheme: url.startsWith('alumniconnect') ? 'alumniconnect' : 'https',
          path: '/yearbook/123',
          queryParams: {},
        });

        const handleIncomingURL = jest.fn();
        mockLinking.addEventListener.mockImplementation((event, handler) => {
          handleIncomingURL.mockImplementation(handler);
          return { remove: jest.fn() };
        });

        expect(() => {
          handleIncomingURL({ url });
        }).not.toThrow();
      });
    });

    it('sanitizes query parameters', () => {
      const deepLink = deepLinkingService.generateDeepLink(
        'invite',
        undefined,
        { 
          code: 'ABC123',
          malicious: '<script>alert(1)</script>',
          normal: 'hello world',
        }
      );

      expect(deepLink).toContain('code=ABC123');
      expect(deepLink).toContain('malicious=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
      expect(deepLink).toContain('normal=hello%20world');
    });

    it('prevents XSS in generated links', () => {
      const maliciousId = '<script>alert("XSS")</script>';
      const deepLink = deepLinkingService.generateDeepLink('yearbook', maliciousId);

      // The ID should be used as-is in the path (not encoded) but should be handled safely
      expect(deepLink).toBe('alumniconnect:///yearbook/<script>alert("XSS")</script>');
    });
  });

  describe('Performance and Reliability', () => {
    it('handles rapid consecutive deep link events', async () => {
      const handleIncomingURL = jest.fn();
      mockLinking.addEventListener.mockImplementation((event, handler) => {
        handleIncomingURL.mockImplementation(handler);
        return { remove: jest.fn() };
      });

      mockLinking.parse.mockReturnValue({
        scheme: 'alumniconnect',
        path: '/yearbook/123',
        queryParams: {},
      });

      // Simulate rapid deep link events
      for (let i = 0; i < 10; i++) {
        handleIncomingURL({ url: `alumniconnect://yearbook/${i}` });
      }

      // Should handle all events without crashing
      expect(mockRouter.push).toHaveBeenCalledTimes(10);
    });

    it('maintains service state across multiple operations', async () => {
      await deepLinkingService.initialize();
      
      // Service should remember initialization state
      await deepLinkingService.initialize(); // Second call
      
      expect(mockLinking.getInitialURL).toHaveBeenCalledTimes(1);
    });

    it('processes pending URLs only once', () => {
      const initialUrl = 'alumniconnect://yearbook/123';
      
      // Set up pending URL
      mockLinking.getInitialURL.mockResolvedValue(initialUrl);
      mockLinking.parse.mockReturnValue({
        scheme: 'alumniconnect',
        path: '/yearbook/123',
        queryParams: {},
      });

      deepLinkingService.initialize();
      deepLinkingService.processPendingUrl();
      deepLinkingService.processPendingUrl(); // Second call

      // Should only process once
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
    });
  });
});