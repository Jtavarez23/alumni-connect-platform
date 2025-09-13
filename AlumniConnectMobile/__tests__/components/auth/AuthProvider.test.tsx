/**
 * Comprehensive Tests for AuthProvider
 * Google-level testing for authentication flows and state management
 */

import React, { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../../components/auth/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { queryHelpers } from '../../../lib/react-query';
import { User, Session, AuthError } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('../../../lib/react-query', () => ({
  queryHelpers: {
    prefetchEssentials: jest.fn(),
    clearUserData: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockQueryHelpers = queryHelpers as jest.Mocked<typeof queryHelpers>;

describe('AuthProvider', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
  };

  const mockSession: Session = {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'mock-refresh-token',
    expires_at: Date.now() / 1000 + 3600,
    user: mockUser,
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    
    mockQueryHelpers.prefetchEssentials.mockResolvedValue();
    mockQueryHelpers.clearUserData.mockResolvedValue();
  });

  describe('Hook Usage', () => {
    it('throws error when used outside AuthProvider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleError.mockRestore();
    });

    it('provides auth context when used within AuthProvider', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current).toMatchObject({
        user: null,
        session: null,
        loading: expect.any(Boolean),
        signIn: expect.any(Function),
        signUp: expect.any(Function),
        signOut: expect.any(Function),
        resetPassword: expect.any(Function),
      });
    });
  });

  describe('Initialization', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });

    it('gets initial session on mount', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(mockQueryHelpers.prefetchEssentials).toHaveBeenCalled();
    });

    it('handles initial session error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const sessionError = new Error('Session fetch failed');
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: sessionError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('Error getting session:', sessionError);
      
      consoleSpy.mockRestore();
    });

    it('sets up auth state change listener', () => {
      renderHook(() => useAuth(), { wrapper });
      
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('cleans up subscription on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const { unmount } = renderHook(() => useAuth(), { wrapper });
      
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Authentication State Changes', () => {
    it('handles sign in state change', async () => {
      let authChangeHandler: (event: any, session: Session | null) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((handler) => {
        authChangeHandler = handler;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        authChangeHandler('SIGNED_IN', mockSession);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.loading).toBe(false);
      expect(mockQueryHelpers.prefetchEssentials).toHaveBeenCalled();
    });

    it('handles sign out state change', async () => {
      let authChangeHandler: (event: any, session: Session | null) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((handler) => {
        authChangeHandler = handler;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // First set user
      await act(async () => {
        authChangeHandler('SIGNED_IN', mockSession);
      });

      // Then sign out
      await act(async () => {
        authChangeHandler('SIGNED_OUT', null);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(mockQueryHelpers.clearUserData).toHaveBeenCalled();
    });

    it('handles token refresh state change', async () => {
      let authChangeHandler: (event: any, session: Session | null) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((handler) => {
        authChangeHandler = handler;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      const updatedSession = { ...mockSession, access_token: 'new-token' };

      await act(async () => {
        authChangeHandler('TOKEN_REFRESHED', updatedSession);
      });

      expect(result.current.session).toEqual(updatedSession);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('Sign In', () => {
    it('signs in successfully', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'password123');
        expect(response.error).toBe(null);
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('handles sign in error', async () => {
      const authError: AuthError = {
        name: 'AuthError',
        message: 'Invalid credentials',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.signIn('test@example.com', 'wrongpassword');
        expect(response.error).toEqual(authError);
      });
    });

    it('sets loading state during sign in', async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise(resolve => {
        resolveSignIn = resolve;
      });

      mockSupabase.auth.signInWithPassword.mockReturnValue(signInPromise as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Start sign in
      act(() => {
        result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.loading).toBe(true);

      // Complete sign in
      await act(async () => {
        resolveSignIn({ data: { user: mockUser, session: mockSession }, error: null });
        await signInPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Sign Up', () => {
    it('signs up successfully', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.signUp('new@example.com', 'password123');
        expect(response.error).toBe(null);
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
    });

    it('handles sign up error', async () => {
      const authError: AuthError = {
        name: 'AuthError',
        message: 'Email already registered',
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.signUp('existing@example.com', 'password123');
        expect(response.error).toEqual(authError);
      });
    });

    it('sets loading state during sign up', async () => {
      let resolveSignUp: (value: any) => void;
      const signUpPromise = new Promise(resolve => {
        resolveSignUp = resolve;
      });

      mockSupabase.auth.signUp.mockReturnValue(signUpPromise as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Start sign up
      act(() => {
        result.current.signUp('new@example.com', 'password123');
      });

      expect(result.current.loading).toBe(true);

      // Complete sign up
      await act(async () => {
        resolveSignUp({ data: { user: mockUser, session: mockSession }, error: null });
        await signUpPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Sign Out', () => {
    it('signs out successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.signOut();
        expect(response.error).toBe(null);
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('handles sign out error', async () => {
      const authError: AuthError = {
        name: 'AuthError',
        message: 'Sign out failed',
      };

      mockSupabase.auth.signOut.mockResolvedValue({
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.signOut();
        expect(response.error).toEqual(authError);
      });
    });

    it('sets loading state during sign out', async () => {
      let resolveSignOut: (value: any) => void;
      const signOutPromise = new Promise(resolve => {
        resolveSignOut = resolve;
      });

      mockSupabase.auth.signOut.mockReturnValue(signOutPromise as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Start sign out
      act(() => {
        result.current.signOut();
      });

      expect(result.current.loading).toBe(true);

      // Complete sign out
      await act(async () => {
        resolveSignOut({ error: null });
        await signOutPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Password Reset', () => {
    it('resets password successfully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.resetPassword('test@example.com');
        expect(response.error).toBe(null);
      });

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'alumniconnect://reset-password' }
      );
    });

    it('handles password reset error', async () => {
      const authError: AuthError = {
        name: 'AuthError',
        message: 'Email not found',
      };

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: authError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const response = await result.current.resetPassword('nonexistent@example.com');
        expect(response.error).toEqual(authError);
      });
    });

    it('does not set loading state for password reset', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      const initialLoading = result.current.loading;

      await act(async () => {
        await result.current.resetPassword('test@example.com');
      });

      expect(result.current.loading).toBe(initialLoading);
    });
  });

  describe('Integration with Query Helpers', () => {
    it('prefetches essential data on successful authentication', async () => {
      let authChangeHandler: (event: any, session: Session | null) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((handler) => {
        authChangeHandler = handler;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        authChangeHandler('SIGNED_IN', mockSession);
      });

      expect(mockQueryHelpers.prefetchEssentials).toHaveBeenCalled();
    });

    it('clears user data on sign out', async () => {
      let authChangeHandler: (event: any, session: Session | null) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((handler) => {
        authChangeHandler = handler;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        authChangeHandler('SIGNED_OUT', null);
      });

      expect(mockQueryHelpers.clearUserData).toHaveBeenCalled();
    });

    it('handles query helper errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQueryHelpers.prefetchEssentials.mockRejectedValue(new Error('Prefetch failed'));

      let authChangeHandler: (event: any, session: Session | null) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((handler) => {
        authChangeHandler = handler;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        authChangeHandler('SIGNED_IN', mockSession);
      });

      // Should still update auth state even if prefetch fails
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Concurrent Operations', () => {
    it('handles concurrent sign in attempts', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const [response1, response2] = await Promise.all([
          result.current.signIn('test1@example.com', 'password1'),
          result.current.signIn('test2@example.com', 'password2'),
        ]);

        expect(response1.error).toBe(null);
        expect(response2.error).toBe(null);
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });

    it('handles mixed auth operations', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const [signInResponse, signUpResponse] = await Promise.all([
          result.current.signIn('test@example.com', 'password'),
          result.current.signUp('new@example.com', 'password'),
        ]);

        expect(signInResponse.error).toBe(null);
        expect(signUpResponse.error).toBe(null);
      });
    });
  });

  describe('State Consistency', () => {
    it('maintains consistent state during rapid auth changes', async () => {
      let authChangeHandler: (event: any, session: Session | null) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((handler) => {
        authChangeHandler = handler;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        // Rapid auth state changes
        authChangeHandler('SIGNED_IN', mockSession);
        authChangeHandler('SIGNED_OUT', null);
        authChangeHandler('SIGNED_IN', mockSession);
      });

      // Final state should be signed in
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('ensures user and session are always synchronized', async () => {
      let authChangeHandler: (event: any, session: Session | null) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((handler) => {
        authChangeHandler = handler;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        authChangeHandler('SIGNED_IN', mockSession);
      });

      expect(result.current.user?.id).toBe(result.current.session?.user.id);

      await act(async () => {
        authChangeHandler('SIGNED_OUT', null);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });
  });
});