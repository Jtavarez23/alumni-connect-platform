/**
 * MSW Server Setup for API Mocking
 * Provides realistic API responses for testing
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { YearbookPage } from '../../types';

// Mock data
const mockYearbookPages: YearbookPage[] = [
  {
    id: '1',
    yearbook_id: 'yearbook-1',
    page_number: 1,
    image_url: 'https://example.com/page1.jpg',
    deep_zoom_url: null,
    ocr_text: null,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    yearbook_id: 'yearbook-1',
    page_number: 2,
    image_url: 'https://example.com/page2.jpg',
    deep_zoom_url: null,
    ocr_text: null,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_metadata: {},
  app_metadata: {},
};

export const handlers = [
  // Supabase Auth endpoints
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    });
  }),

  http.post('*/auth/v1/signup', () => {
    return HttpResponse.json({
      user: mockUser,
      session: {
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: mockUser,
      },
    });
  }),

  http.post('*/auth/v1/logout', () => {
    return HttpResponse.json({});
  }),

  http.post('*/auth/v1/recover', () => {
    return HttpResponse.json({});
  }),

  // Supabase database endpoints
  http.get('*/rest/v1/yearbook_pages', ({ request }) => {
    const url = new URL(request.url);
    const yearbookId = url.searchParams.get('yearbook_id');
    
    if (yearbookId) {
      const filteredPages = mockYearbookPages.filter(
        page => page.yearbook_id === yearbookId
      );
      return HttpResponse.json(filteredPages);
    }
    
    return HttpResponse.json(mockYearbookPages);
  }),

  http.get('*/rest/v1/yearbooks', () => {
    return HttpResponse.json([
      {
        id: 'yearbook-1',
        title: 'Class of 2020',
        school_name: 'Test University',
        year: 2020,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  http.get('*/rest/v1/events', () => {
    return HttpResponse.json([
      {
        id: 'event-1',
        title: 'Alumni Reunion',
        description: 'Annual alumni reunion event',
        date: '2024-06-15T18:00:00Z',
        location: 'Test University Campus',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  // Error scenarios for testing
  http.get('*/rest/v1/yearbook_pages_error', () => {
    return HttpResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }),

  http.post('*/auth/v1/token_error', () => {
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 400 }
    );
  }),
];

export const server = setupServer(...handlers);