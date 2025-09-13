/**
 * Comprehensive Tests for Tab Navigation Layout
 * Google-level testing for navigation patterns and user experience
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';

import TabLayout from '@/app/(tabs)/_layout';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Mock dependencies
jest.mock('expo-router', () => ({
  Tabs: {
    Screen: ({ children }: { children: React.ReactNode }) => children,
  },
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/haptic-tab', () => ({
  HapticTab: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: ({ name, color, size }: { name: string; color: string; size: number }) => (
    <div data-testid={`icon-${name}`} style={{ color, fontSize: size }} />
  ),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(),
}));

jest.mock('@/constants/theme', () => ({
  Colors: {
    light: {
      primary: '#0F172A',
      secondary: '#64748B',
      background: '#FFFFFF',
      border: '#E2E8F0',
    },
    dark: {
      primary: '#0F172A',
      secondary: '#64748B',
      background: '#1E293B',
      border: '#334155',
    },
  },
}));

const mockUseColorScheme = useColorScheme as jest.Mock;

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((spec) => spec.ios),
}));

describe('TabLayout Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
  });

  describe('Light Theme Configuration', () => {
    it('renders with light theme colors', () => {
      mockUseColorScheme.mockReturnValue('light');
      
      const { getByTestId } = render(<TabLayout />);
      
      // Check that icons are rendered with light theme colors
      expect(getByTestId('icon-house')).toBeTruthy();
      expect(getByTestId('icon-book')).toBeTruthy();
      expect(getByTestId('icon-person.2')).toBeTruthy();
      expect(getByTestId('icon-calendar')).toBeTruthy();
      expect(getByTestId('icon-person.crop.circle')).toBeTruthy();
    });

    it('applies light theme styling to tab bar', () => {
      mockUseColorScheme.mockReturnValue('light');
      
      const { getByTestId } = render(<TabLayout />);
      
      // Should use light background and border colors
      const tabBar = getByTestId('tab-bar');
      expect(tabBar.props.style.backgroundColor).toBe('#FFFFFF');
      expect(tabBar.props.style.borderTopColor).toBe('#E2E8F0');
    });
  });

  describe('Dark Theme Configuration', () => {
    it('renders with dark theme colors', () => {
      mockUseColorScheme.mockReturnValue('dark');
      
      const { getByTestId } = render(<TabLayout />);
      
      // Check that icons are rendered
      expect(getByTestId('icon-house')).toBeTruthy();
      expect(getByTestId('icon-book')).toBeTruthy();
      expect(getByTestId('icon-person.2')).toBeTruthy();
      expect(getByTestId('icon-calendar')).toBeTruthy();
      expect(getByTestId('icon-person.crop.circle')).toBeTruthy();
    });

    it('applies dark theme styling to tab bar', () => {
      mockUseColorScheme.mockReturnValue('dark');
      
      const { getByTestId } = render(<TabLayout />);
      
      // Should use dark background and border colors
      const tabBar = getByTestId('tab-bar');
      expect(tabBar.props.style.backgroundColor).toBe('#1E293B');
      expect(tabBar.props.style.borderTopColor).toBe('#334155');
    });
  });

  describe('Platform-Specific Styling', () => {
    it('applies iOS-specific padding and height', () => {
      require('react-native/Libraries/Utilities/Platform').OS = 'ios';
      
      const { getByTestId } = render(<TabLayout />);
      
      const tabBar = getByTestId('tab-bar');
      expect(tabBar.props.style.paddingBottom).toBe(20);
      expect(tabBar.props.style.paddingTop).toBe(10);
      expect(tabBar.props.style.height).toBe(90);
    });

    it('applies Android-specific padding and height', () => {
      require('react-native/Libraries/Utilities/Platform').OS = 'android';
      
      const { getByTestId } = render(<TabLayout />);
      
      const tabBar = getByTestId('tab-bar');
      expect(tabBar.props.style.paddingBottom).toBe(10);
      expect(tabBar.props.style.paddingTop).toBe(10);
      expect(tabBar.props.style.height).toBe(70);
    });
  });

  describe('Tab Configuration', () => {
    it('renders all main navigation tabs', () => {
      const { getByTestId } = render(<TabLayout />);
      
      // All main tabs should be present
      expect(getByTestId('tab-feed')).toBeTruthy();
      expect(getByTestId('tab-yearbooks')).toBeTruthy();
      expect(getByTestId('tab-network')).toBeTruthy();
      expect(getByTestId('tab-events')).toBeTruthy();
      expect(getByTestId('tab-profile')).toBeTruthy();
    });

    it('hides explore tab from tab bar', () => {
      const { queryByTestId } = render(<TabLayout />);
      
      // Explore tab should be hidden from tab bar
      expect(queryByTestId('tab-explore')).toBeNull();
    });

    it('uses correct tab titles', () => {
      const { getByText } = render(<TabLayout />);
      
      expect(getByText('Feed')).toBeTruthy();
      expect(getByText('Yearbooks')).toBeTruthy();
      expect(getByText('Network')).toBeTruthy();
      expect(getByText('Events')).toBeTruthy();
      expect(getByText('Profile')).toBeTruthy();
    });

    it('uses correct icon names for focused and unfocused states', () => {
      const { getByTestId } = render(<TabLayout />);
      
      // Should use fill variants for focused state
      expect(getByTestId('icon-house.fill')).toBeTruthy();
      expect(getByTestId('icon-book.fill')).toBeTruthy();
      expect(getByTestId('icon-person.2.fill')).toBeTruthy();
      expect(getByTestId('icon-calendar.badge.plus')).toBeTruthy();
      expect(getByTestId('icon-person.crop.circle.fill')).toBeTruthy();
    });
  });

  describe('Accessibility Features', () => {
    it('includes proper accessibility labels', () => {
      const { getByTestId } = render(<TabLayout />);
      
      const feedTab = getByTestId('tab-feed');
      const yearbooksTab = getByTestId('tab-yearbooks');
      const networkTab = getByTestId('tab-network');
      const eventsTab = getByTestId('tab-events');
      const profileTab = getByTestId('tab-profile');
      
      expect(feedTab.props.accessibilityLabel).toBe('Feed tab');
      expect(yearbooksTab.props.accessibilityLabel).toBe('Yearbooks tab');
      expect(networkTab.props.accessibilityLabel).toBe('Network tab');
      expect(eventsTab.props.accessibilityLabel).toBe('Events tab');
      expect(profileTab.props.accessibilityLabel).toBe('Profile tab');
    });

    it('includes proper accessibility hints', () => {
      const { getByTestId } = render(<TabLayout />);
      
      const feedTab = getByTestId('tab-feed');
      const yearbooksTab = getByTestId('tab-yearbooks');
      
      expect(feedTab.props.accessibilityHint).toBe('Double tap to view your feed');
      expect(yearbooksTab.props.accessibilityHint).toBe('Double tap to browse yearbooks');
    });
  });

  describe('Performance Optimization', () => {
    it('uses BlurView for tab bar background', () => {
      const { getByTestId } = render(<TabLayout />);
      
      const blurView = getByTestId('blur-view');
      expect(blurView).toBeTruthy();
      expect(blurView.type).toBe(BlurView);
    });

    it('applies proper blur intensity', () => {
      const { getByTestId } = render(<TabLayout />);
      
      const blurView = getByTestId('blur-view');
      expect(blurView.props.intensity).toBe(100);
    });
  });

  describe('Haptic Feedback Integration', () => {
    it('wraps tabs with HapticTab component', () => {
      const { getByTestId } = render(<TabLayout />);
      
      const feedTab = getByTestId('tab-feed');
      expect(feedTab.props.onPress).toBeDefined();
      
      // Simulate tab press to verify haptic feedback
      const mockHaptic = jest.fn();
      require('@/components/haptic-tab').HapticTab = {
        onPress: mockHaptic,
      };
      
      feedTab.props.onPress();
      expect(mockHaptic).toHaveBeenCalled();
    });
  });

  describe('Theme Switching', () => {
    it('responds to theme changes dynamically', () => {
      // Initial render with light theme
      mockUseColorScheme.mockReturnValue('light');
      const { getByTestId, rerender } = render(<TabLayout />);
      
      let tabBar = getByTestId('tab-bar');
      expect(tabBar.props.style.backgroundColor).toBe('#FFFFFF');
      
      // Re-render with dark theme
      mockUseColorScheme.mockReturnValue('dark');
      rerender(<TabLayout />);
      
      tabBar = getByTestId('tab-bar');
      expect(tabBar.props.style.backgroundColor).toBe('#1E293B');
    });
  });

  describe('Error Boundary and Resilience', () => {
    it('handles missing color scheme gracefully', () => {
      mockUseColorScheme.mockReturnValue(null);
      
      // Should not crash and use default styling
      expect(() => render(<TabLayout />)).not.toThrow();
      
      const { getByTestId } = render(<TabLayout />);
      const tabBar = getByTestId('tab-bar');
      expect(tabBar).toBeTruthy();
    });

    it('handles platform detection failures', () => {
      // Mock platform detection to fail
      jest.spyOn(Platform, 'select').mockImplementation(() => {
        throw new Error('Platform detection failed');
      });
      
      // Should fall back to default values
      expect(() => render(<TabLayout />)).not.toThrow();
      
      const { getByTestId } = render(<TabLayout />);
      const tabBar = getByTestId('tab-bar');
      expect(tabBar).toBeTruthy();
    });
  });

  describe('Memory and Performance', () => {
    it('does not cause memory leaks on unmount', () => {
      const { unmount } = render(<TabLayout />);
      
      // Should clean up properly
      expect(() => unmount()).not.toThrow();
      
      // Verify no hanging event listeners
      const mockRemove = jest.fn();
      jest.spyOn(Platform, 'addEventListener').mockReturnValue({ remove: mockRemove });
      
      const { unmount: unmount2 } = render(<TabLayout />);
      unmount2();
      
      expect(mockRemove).toHaveBeenCalled();
    });

    it('maintains consistent render performance', () => {
      const startTime = performance.now();
      
      render(<TabLayout />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly (under 50ms)
      expect(renderTime).toBeLessThan(50);
    });
  });
});