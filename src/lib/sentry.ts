import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || "development";
const ENABLE_MONITORING = import.meta.env.VITE_ENABLE_ERROR_MONITORING === "true";

export function initSentry() {
  if (!SENTRY_DSN || !ENABLE_MONITORING) {
    console.log("Sentry monitoring disabled");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: APP_VERSION,
    integrations: [
      Sentry.browserTracingIntegration({
        // Set tracing origins to connect the error to the request
        tracePropagationTargets: ["localhost", /^https:\/\/yourapp\.com\/api/],
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,
    
    // Error Filtering
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (ENVIRONMENT === "development" && !import.meta.env.VITE_FORCE_SENTRY) {
        return null;
      }
      
      // Filter out common non-critical errors
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error.message === 'string') {
          // Skip network errors that are likely user connection issues
          if (error.message.includes('NetworkError') || 
              error.message.includes('Failed to fetch')) {
            return null;
          }
          
          // Skip ResizeObserver errors (common but harmless)
          if (error.message.includes('ResizeObserver')) {
            return null;
          }
        }
      }
      
      return event;
    },
    
    // User Context
    initialScope: {
      tags: {
        component: "alumni-connect"
      }
    }
  });
}

// Helper functions for manual error reporting
export const captureError = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
  Sentry.captureMessage(message, level);
};

export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username
  });
};