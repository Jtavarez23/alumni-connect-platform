declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID;
const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === "true";
const IS_PRODUCTION = import.meta.env.PROD;

export function initAnalytics() {
  if (!GA_TRACKING_ID || !ENABLE_ANALYTICS || !IS_PRODUCTION) {
    console.log("Analytics disabled");
    return;
  }

  // Load Google Analytics
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  // Configure gtag
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    (window as any).dataLayer = (window as any).dataLayer || [];
    // eslint-disable-next-line prefer-rest-params
    (window as any).dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
}

// Page view tracking
export function trackPageView(path: string, title?: string) {
  if (!window.gtag || !ENABLE_ANALYTICS) return;

  window.gtag('config', GA_TRACKING_ID!, {
    page_path: path,
    page_title: title || document.title,
  });
}

// Event tracking
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (!window.gtag || !ENABLE_ANALYTICS) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// User engagement events
export const analytics = {
  // Authentication events
  login: (method: string) => trackEvent('login', 'auth', method),
  signup: (method: string) => trackEvent('sign_up', 'auth', method),
  logout: () => trackEvent('logout', 'auth'),

  // Profile events
  profileUpdate: () => trackEvent('profile_update', 'user'),
  profileView: (targetUserId: string) => trackEvent('profile_view', 'social', targetUserId),

  // Social events  
  friendRequest: (action: 'sent' | 'accepted' | 'declined') => 
    trackEvent('friend_request', 'social', action),
  message: (type: 'sent' | 'received') => trackEvent('message', 'social', type),

  // Yearbook events
  yearbookUpload: () => trackEvent('yearbook_upload', 'content'),
  yearbookView: (yearbookId: string) => trackEvent('yearbook_view', 'content', yearbookId),

  // Alumni search
  alumniSearch: (query: string) => trackEvent('search', 'alumni', query),
  alumniFilter: (filterType: string) => trackEvent('filter', 'alumni', filterType),

  // Engagement
  pageView: (path: string) => trackPageView(path),
  buttonClick: (buttonName: string, context: string) => 
    trackEvent('button_click', 'engagement', `${context}:${buttonName}`),
  
  // Errors
  error: (errorType: string, errorMessage: string) => 
    trackEvent('error', 'technical', `${errorType}:${errorMessage}`),
};

// User properties (for segmentation)
export function setUserProperties(properties: {
  userId?: string;
  graduationYear?: number;
  schoolCount?: number;
  userType?: 'student' | 'alumni' | 'admin';
}) {
  if (!window.gtag || !ENABLE_ANALYTICS) return;

  window.gtag('config', GA_TRACKING_ID!, {
    custom_map: properties,
  });
}