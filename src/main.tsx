import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize monitoring safely
const initMonitoring = async () => {
  try {
    if (import.meta.env.PROD) {
      const { initSentry } = await import('./lib/sentry');
      const { initAnalytics } = await import('./lib/analytics');
      initSentry();
      initAnalytics();
    }
  } catch (error) {
    console.warn('Failed to initialize monitoring:', error);
  }
};

// Start the app
initMonitoring();
createRoot(document.getElementById("root")!).render(<App />);
