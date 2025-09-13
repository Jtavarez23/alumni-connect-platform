// Test DeepSeek API Connection
console.log('🔌 Testing DeepSeek API Connection...\n');

// Display current environment variables
console.log('Environment Configuration:');
console.log(`ANTHROPIC_BASE_URL: ${process.env.ANTHROPIC_BASE_URL}`);
console.log(`ANTHROPIC_MODEL: ${process.env.ANTHROPIC_MODEL}`);
console.log(`ANTHROPIC_SMALL_FAST_MODEL: ${process.env.ANTHROPIC_SMALL_FAST_MODEL}`);
console.log(`API_TIMEOUT_MS: ${process.env.API_TIMEOUT_MS}`);
console.log(`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: ${process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC}`);
console.log(`API Key (masked): ${process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 12) + '...' : 'Not set'}\n`);

// Test API connectivity (basic check)
const testConnection = async () => {
  try {
    const response = await fetch('https://api.deepseek.com/anthropic/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ DeepSeek API connection successful!');
      const data = await response.json();
      console.log('Available models:', data?.data?.map(m => m.id) || 'Unable to parse models');
    } else {
      console.log(`❌ API connection failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
    console.log('This might be expected if the endpoint structure is different.');
  }
};

testConnection();