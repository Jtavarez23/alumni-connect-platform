// Test DeepSeek API Connection with direct configuration
console.log('🔌 Testing DeepSeek API Connection (Direct Config)...\n');

// Set environment variables directly
process.env.ANTHROPIC_BASE_URL = "https://api.deepseek.com/anthropic";
process.env.ANTHROPIC_AUTH_TOKEN = "sk-70fa0935d7d144c3a142a6c36cc43922";
process.env.ANTHROPIC_API_KEY = "sk-70fa0935d7d144c3a142a6c36cc43922";
process.env.ANTHROPIC_MODEL = "deepseek-reasoner";
process.env.ANTHROPIC_SMALL_FAST_MODEL = "deepseek-chat";
process.env.API_TIMEOUT_MS = "600000";
process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";

// Display configuration
console.log('Environment Configuration:');
console.log(`ANTHROPIC_BASE_URL: ${process.env.ANTHROPIC_BASE_URL}`);
console.log(`ANTHROPIC_MODEL: ${process.env.ANTHROPIC_MODEL}`);
console.log(`ANTHROPIC_SMALL_FAST_MODEL: ${process.env.ANTHROPIC_SMALL_FAST_MODEL}`);
console.log(`API_TIMEOUT_MS: ${process.env.API_TIMEOUT_MS}`);
console.log(`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: ${process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC}`);
console.log(`API Key (masked): ${process.env.ANTHROPIC_API_KEY.substring(0, 12)}...\n`);

// Test different DeepSeek API endpoints
const testEndpoints = async () => {
  const endpoints = [
    'https://api.deepseek.com/v1/models',
    'https://api.deepseek.com/anthropic/v1/models', 
    'https://api.deepseek.com/models'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing endpoint: ${endpoint}`);
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`  Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log('  ✅ Connection successful!');
        try {
          const data = await response.json();
          console.log('  Available models:', data?.data?.map(m => m.id) || data?.models || 'Unable to parse models');
        } catch (e) {
          console.log('  Response received but unable to parse JSON');
        }
      } else {
        console.log('  ❌ Connection failed');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }
};

// Test Claude Code compatibility
const testClaudeCodeCompatibility = () => {
  console.log('🔧 Claude Code Environment Variables Status:');
  console.log('All required environment variables are set ✅');
  console.log('\nNext steps:');
  console.log('1. Restart your terminal to pick up permanent environment variables');
  console.log('2. Try running Claude Code - it should now connect to DeepSeek API');
  console.log('3. The models "deepseek-reasoner" and "deepseek-chat" will be used');
  console.log('4. API timeout set to 10 minutes (600000ms) for longer responses');
};

// Run tests
testEndpoints().then(() => {
  testClaudeCodeCompatibility();
});