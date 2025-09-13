#!/usr/bin/env node

import autocannon from 'autocannon';
import { Command } from 'commander';
const program = new Command();

program
  .option('-u, --url <url>', 'Target URL', 'http://localhost:3000')
  .option('-c, --connections <number>', 'Number of concurrent connections', 10)
  .option('-p, --pipelining <number>', 'Number of pipelined requests', 1)
  .option('-d, --duration <seconds>', 'Duration of test in seconds', 30)
  .option('-r, --rate <number>', 'Request rate per second', 0)
  .parse(process.argv);

const options = program.opts();

// Test scenarios for different endpoints
const testScenarios = [
  {
    name: 'Home Page',
    path: '/',
    method: 'GET'
  },
  {
    name: 'Login Page',
    path: '/login',
    method: 'GET'
  },
  {
    name: 'Signup Page',
    path: '/signup',
    method: 'GET'
  },
  {
    name: 'Dashboard Page',
    path: '/dashboard',
    method: 'GET'
  }
];

async function runLoadTest(scenario) {
  console.log(`\n🚀 Testing: ${scenario.name}`);
  console.log(`📋 Endpoint: ${scenario.method} ${options.url}${scenario.path}`);
  
  const config = {
    url: options.url + scenario.path,
    connections: parseInt(options.connections),
    pipelining: parseInt(options.pipelining),
    duration: parseInt(options.duration),
    requests: [{
      method: scenario.method,
      ...(scenario.body && { body: scenario.body }),
      ...(scenario.headers && { headers: scenario.headers })
    }]
  };
  
  if (options.rate > 0) {
    config.rate = parseInt(options.rate);
  }
  
  try {
    const result = await autocannon(config);
    
    console.log('📊 Results:');
    console.log(`   Requests: ${result.requests.total}`);
    console.log(`   Throughput: ${result.throughput.total} req/sec`);
    console.log(`   Latency (avg): ${result.latency.average}ms`);
    console.log(`   Latency (p99): ${result.latency.p99}ms`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Timeouts: ${result.timeouts}`);
    
    // Performance assessment
    if (result.latency.average > 1000) {
      console.log('❌ Performance Issue: High latency detected');
    } else if (result.latency.average > 500) {
      console.log('⚠️  Warning: Moderate latency detected');
    } else {
      console.log('✅ Good: Latency within acceptable range');
    }
    
    if (result.errors > 0) {
      console.log(`❌ Errors detected: ${result.errors}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error testing ${scenario.name}:`, error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🎯 Starting Alumni Connect Load Tests');
  console.log('=====================================');
  
  const results = [];
  
  for (const scenario of testScenarios) {
    const result = await runLoadTest(scenario);
    if (result) {
      results.push({
        scenario: scenario.name,
        ...result
      });
    }
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary report
  console.log('\n📈 SUMMARY REPORT');
  console.log('================');
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.scenario}:`);
    console.log(`   Throughput: ${result.throughput.total} req/sec`);
    console.log(`   Avg Latency: ${result.latency.average}ms`);
    console.log(`   Success Rate: ${((result.requests.total - result.errors) / result.requests.total * 100).toFixed(1)}%`);
  });
  
  // Overall assessment
  const avgLatency = results.reduce((sum, r) => sum + r.latency.average, 0) / results.length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  
  console.log('\n🎯 OVERALL ASSESSMENT:');
  console.log(`   Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`   Total Errors: ${totalErrors}`);
  
  if (totalErrors === 0 && avgLatency < 500) {
    console.log('✅ EXCELLENT: System performing well under load');
  } else if (totalErrors === 0 && avgLatency < 1000) {
    console.log('⚠️  ACCEPTABLE: System functional but could use optimization');
  } else {
    console.log('❌ NEEDS ATTENTION: Performance issues detected');
  }
}

// Run if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  runAllTests().catch(console.error);
}

export { runLoadTest, runAllTests };