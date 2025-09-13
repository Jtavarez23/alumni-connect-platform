// Performance Testing Configuration for Alumni Connect
module.exports = {
  // Lighthouse configuration for frontend performance
  lighthouse: {
    thresholds: {
      performance: 80,
      accessibility: 90,
      bestPractices: 85,
      seo: 85
    },
    url: 'http://localhost:3000',
    options: {
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
    }
  },
  
  // Load testing configuration
  loadTest: {
    scenarios: {
      normal_load: {
        executor: 'ramping-vus',
        stages: [
          { duration: '30s', target: 50 },  // Ramp up to 50 users
          { duration: '1m', target: 50 },   // Stay at 50 users
          { duration: '30s', target: 0 }    // Ramp down
        ]
      },
      stress_test: {
        executor: 'ramping-vus',
        stages: [
          { duration: '1m', target: 100 },
          { duration: '2m', target: 100 },
          { duration: '1m', target: 0 }
        ]
      }
    },
    
    // API endpoints to test
    endpoints: [
      { method: 'GET', url: 'http://localhost:3000/api/health' },
      { method: 'GET', url: 'http://localhost:3000/api/posts' },
      { method: 'POST', url: 'http://localhost:3000/api/auth/login', body: {
        email: 'test@example.com',
        password: 'password123'
      }}
    ]
  },
  
  // Database performance monitoring
  database: {
    slowQueryThreshold: 100, // milliseconds
    monitorQueries: true,
    trackConnectionPool: true
  },
  
  // Memory and CPU monitoring
  system: {
    cpuThreshold: 80, // %
    memoryThreshold: 85, // %
    checkInterval: 5000 // milliseconds
  }
};