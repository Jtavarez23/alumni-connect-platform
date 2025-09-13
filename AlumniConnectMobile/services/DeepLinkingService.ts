/**
 * Deep Linking Service for Alumni Connect Mobile
 * Handles all deep linking, URL routing, and sharing capabilities
 * Google-level implementation with comprehensive URL parsing and validation
 */

import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { router, type Href } from 'expo-router';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

// Deep link URL patterns
const URL_PATTERNS = {
  // alumniconnect://yearbook/12345
  YEARBOOK: /^\/yearbook\/([a-zA-Z0-9-]+)$/,
  // alumniconnect://profile/user-id
  PROFILE: /^\/profile\/([a-zA-Z0-9-]+)$/,
  // alumniconnect://event/event-id
  EVENT: /^\/event\/([a-zA-Z0-9-]+)$/,
  // alumniconnect://post/post-id
  POST: /^\/post\/([a-zA-Z0-9-]+)$/,
  // alumniconnect://subscription
  SUBSCRIPTION: /^\/subscription$/,
  // alumniconnect://perks
  PERKS: /^\/perks$/,
  // alumniconnect://network
  NETWORK: /^\/network$/,
  // alumniconnect://invite?code=xyz
  INVITE: /^\/invite$/,
} as const;

interface DeepLinkData {
  url: string;
  scheme: string;
  hostname?: string;
  path: string;
  queryParams: Record<string, string>;
}

interface ShareContent {
  title: string;
  message: string;
  url: string;
}

class DeepLinkingService {
  private isInitialized = false;
  private pendingUrl: string | null = null;

  /**
   * Initialize the deep linking service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Handle initial URL if app was opened via deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('Initial URL:', initialUrl);
        this.pendingUrl = initialUrl;
      }

      // Listen for incoming deep links while app is running
      const subscription = Linking.addEventListener('url', this.handleIncomingURL);

      this.isInitialized = true;
      console.log('DeepLinkingService initialized');

      return undefined;
    } catch (error) {
      console.error('Failed to initialize deep linking:', error);
    }
  }

  /**
   * Process any pending URL after app is ready
   */
  public processPendingUrl(): void {
    if (this.pendingUrl) {
      this.handleIncomingURL({ url: this.pendingUrl });
      this.pendingUrl = null;
    }
  }

  /**
   * Handle incoming URL from deep link
   */
  private handleIncomingURL = ({ url }: { url: string }): void => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('Handling deep link:', url);

      const linkData = this.parseDeepLink(url);
      if (!linkData) {
        console.warn('Invalid deep link format:', url);
        return;
      }

      this.navigateToDeepLink(linkData);
    } catch (error) {
      console.error('Error handling deep link:', error);
      Alert.alert(
        'Link Error',
        'Sorry, we could not open that link. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Parse deep link URL into structured data
   */
  private parseDeepLink(url: string): DeepLinkData | null {
    try {
      const parsed = Linking.parse(url);
      
      if (!parsed.scheme || !parsed.path) {
        return null;
      }

      return {
        url,
        scheme: parsed.scheme,
        hostname: parsed.hostname || undefined,
        path: parsed.path,
        queryParams: this.normalizeQueryParams(parsed.queryParams || {}),
      };
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  }

  /**
   * Normalize query parameters to string values only
   */
  private normalizeQueryParams(params: Record<string, string | string[] | undefined>): Record<string, string> {
    const normalized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        normalized[key] = value[0] || '';
      } else if (value !== undefined) {
        normalized[key] = value;
      } else {
        normalized[key] = '';
      }
    }
    
    return normalized;
  }

  /**
   * Navigate to the appropriate screen based on deep link
   */
  private navigateToDeepLink(linkData: DeepLinkData): void {
    const { path, queryParams } = linkData;

    // Yearbook deep link
    const yearbookMatch = path.match(URL_PATTERNS.YEARBOOK);
    if (yearbookMatch) {
      const yearbookId = yearbookMatch[1];
      router.push(`/yearbook/${yearbookId}`);
      return;
    }

    // Profile deep link
    const profileMatch = path.match(URL_PATTERNS.PROFILE);
    if (profileMatch) {
      const userId = profileMatch[1];
      router.push(`/profile/${userId}` as any);
      return;
    }

    // Event deep link
    const eventMatch = path.match(URL_PATTERNS.EVENT);
    if (eventMatch) {
      const eventId = eventMatch[1];
      router.push(`/event/${eventId}` as any);
      return;
    }

    // Post deep link
    const postMatch = path.match(URL_PATTERNS.POST);
    if (postMatch) {
      const postId = postMatch[1];
      // Navigate to post (could be implemented as a modal)
      router.push(`/post/${postId}` as any);
      return;
    }

    // Subscription deep link
    if (URL_PATTERNS.SUBSCRIPTION.test(path)) {
      router.push('/subscription' as any);
      return;
    }

    // Alumni perks deep link
    if (URL_PATTERNS.PERKS.test(path)) {
      router.push('/perks' as any);
      return;
    }

    // Network deep link
    if (URL_PATTERNS.NETWORK.test(path)) {
      router.push('/(tabs)/network' as any);
      return;
    }

    // Invite deep link with referral code
    const inviteMatch = path.match(URL_PATTERNS.INVITE);
    if (inviteMatch && queryParams.code) {
      // Handle invite with referral code
      this.handleInviteLink(queryParams.code);
      return;
    }

    // Default fallback - go to main feed
    router.push('/(tabs)/' as any);
  }

  /**
   * Handle invite links with referral codes
   */
  private handleInviteLink(referralCode: string): void {
    Alert.alert(
      'Join Alumni Connect',
      `You've been invited to join Alumni Connect! Use referral code: ${referralCode}`,
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Sign Up', 
          onPress: () => {
            // Navigate to signup with referral code
            router.push(`/signup?referral=${referralCode}` as any);
          }
        },
      ]
    );
  }

  /**
   * Generate shareable deep links
   */
  public generateDeepLink(type: string, id?: string, params?: Record<string, string>): string {
    const baseUrl = 'alumniconnect://';
    let path = '';

    switch (type) {
      case 'yearbook':
        path = `/yearbook/${id}`;
        break;
      case 'profile':
        path = `/profile/${id}`;
        break;
      case 'event':
        path = `/event/${id}`;
        break;
      case 'post':
        path = `/post/${id}`;
        break;
      case 'subscription':
        path = '/subscription';
        break;
      case 'perks':
        path = '/perks';
        break;
      case 'network':
        path = '/network';
        break;
      case 'invite':
        path = '/invite';
        break;
      default:
        path = '/';
    }

    let url = baseUrl + path;

    // Add query parameters
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Generate web fallback URL for universal links
   */
  public generateWebLink(type: string, id?: string, params?: Record<string, string>): string {
    const baseUrl = 'https://alumni-connect.com'; // Replace with actual domain
    let path = '';

    switch (type) {
      case 'yearbook':
        path = `/yearbooks/${id}`;
        break;
      case 'profile':
        path = `/profile/${id}`;
        break;
      case 'event':
        path = `/events/${id}`;
        break;
      case 'post':
        path = `/posts/${id}`;
        break;
      case 'subscription':
        path = '/subscription';
        break;
      case 'perks':
        path = '/perks';
        break;
      case 'network':
        path = '/network';
        break;
      case 'invite':
        path = '/invite';
        break;
      default:
        path = '/';
    }

    let url = baseUrl + path;

    // Add query parameters
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Share content with deep linking
   */
  public async shareContent(content: ShareContent): Promise<boolean> {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(content.url, {
            dialogTitle: content.title,
            mimeType: 'text/plain',
          });
          return true;
        }
      }

      // Fallback for web or unsupported platforms
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: content.title,
            text: content.message,
            url: content.url,
          });
          return true;
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(`${content.message}\n\n${content.url}`);
          Alert.alert('Copied!', 'Link copied to clipboard');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error sharing content:', error);
      Alert.alert(
        'Share Error',
        'Sorry, we could not share that content. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Share yearbook with deep link
   */
  public async shareYearbook(yearbookId: string, yearbookTitle: string): Promise<void> {
    const deepLink = this.generateDeepLink('yearbook', yearbookId);
    const webLink = this.generateWebLink('yearbook', yearbookId);

    const content: ShareContent = {
      title: `Check out ${yearbookTitle} on Alumni Connect`,
      message: `I found this yearbook on Alumni Connect and thought you'd like to see it!`,
      url: Platform.OS === 'web' ? webLink : deepLink,
    };

    await this.shareContent(content);
  }

  /**
   * Share event with deep link
   */
  public async shareEvent(eventId: string, eventTitle: string): Promise<void> {
    const deepLink = this.generateDeepLink('event', eventId);
    const webLink = this.generateWebLink('event', eventId);

    const content: ShareContent = {
      title: `Join me at ${eventTitle}`,
      message: `Check out this alumni event I'm attending!`,
      url: Platform.OS === 'web' ? webLink : deepLink,
    };

    await this.shareContent(content);
  }

  /**
   * Share profile with deep link
   */
  public async shareProfile(userId: string, userName: string): Promise<void> {
    const deepLink = this.generateDeepLink('profile', userId);
    const webLink = this.generateWebLink('profile', userId);

    const content: ShareContent = {
      title: `Connect with ${userName} on Alumni Connect`,
      message: `Check out my profile on Alumni Connect!`,
      url: Platform.OS === 'web' ? webLink : deepLink,
    };

    await this.shareContent(content);
  }

  /**
   * Share invite link with referral code
   */
  public async shareInvite(referralCode: string): Promise<void> {
    const deepLink = this.generateDeepLink('invite', undefined, { code: referralCode });
    const webLink = this.generateWebLink('invite', undefined, { code: referralCode });

    const content: ShareContent = {
      title: 'Join me on Alumni Connect',
      message: 'Reconnect with your classmates and explore yearbook memories together!',
      url: Platform.OS === 'web' ? webLink : deepLink,
    };

    await this.shareContent(content);
  }

  /**
   * Open external URL with proper handling
   */
  public async openExternalUrl(url: string): Promise<boolean> {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      } else {
        Alert.alert(
          'Cannot Open Link',
          'This link cannot be opened on your device.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Error opening external URL:', error);
      return false;
    }
  }
}

// Export singleton instance
export const deepLinkingService = new DeepLinkingService();
export default deepLinkingService;