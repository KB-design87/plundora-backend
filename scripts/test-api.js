const http = require('http');

console.log('🧪 API Endpoint Test Script');
console.log('============================\n');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const ENDPOINTS = [
  { path: '/health', method: 'GET', description: 'Health check' },
  { path: '/api/sales', method: 'GET', description: 'Get sales' },
  { path: '/api/stores', method: 'GET', description: 'Get stores' },
  { path: '/api/auth/register', method: 'POST', description: 'User registration', 
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    })
  }
];

// Helper function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test a single endpoint
async function testEndpoint(endpoint) {
  const url = new URL(endpoint.path, BASE_URL);
  
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Plundora-API-Test'
    }
  };

  if (endpoint.body) {
    options.headers['Content-Length'] = Buffer.byteLength(endpoint.body);
  }

  try {
    console.log(`🔍 Testing ${endpoint.method} ${endpoint.path}`);
    
    const response = await makeRequest(options);
    
    // Parse response body
    let responseBody;
    try {
      responseBody = JSON.parse(response.body);
    } catch (e) {
      responseBody = response.body;
    }

    // Determine status
    let status = '❌ FAIL';
    if (response.statusCode === 200) {
      status = '✅ OK';
    } else if (response.statusCode === 404) {
      status = '❌ 404 NOT FOUND';
    } else if (response.statusCode >= 500) {
      status = '⚠️  SERVER ERROR';
    } else if (response.statusCode >= 400) {
      status = '⚠️  CLIENT ERROR';
    }

    console.log(`   Status: ${status} (${response.statusCode})`);
    
    if (response.statusCode === 404) {
      console.log('   ❗ This endpoint is not found - check your routes!');
    } else if (response.statusCode >= 500) {
      console.log('   ❗ Server error - check database connection and logs');
    } else if (response.statusCode === 200) {
      console.log('   ✅ Endpoint working correctly');
    }

    // Show response preview
    if (typeof responseBody === 'object') {
      console.log(`   Response: ${JSON.stringify(responseBody).substring(0, 100)}...`);
    } else {
      console.log(`   Response: ${responseBody.substring(0, 100)}...`);
    }
    
    console.log('');
    return response.statusCode !== 404;
    
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    console.log('');
    return false;
  }
}

// Main test function
async function runTests() {
  console.log(`🌐 Testing API at: ${BASE_URL}\n`);
  
  let passed = 0;
  let total = ENDPOINTS.length;
  
  for (const endpoint of ENDPOINTS) {
    const success = await testEndpoint(endpoint);
    if (success) passed++;
  }
  
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All endpoints are working! Your API is ready.');
  } else if (passed === 0) {
    console.log('\n🚨 No endpoints are working. Check your server configuration.');
  } else {
    console.log('\n⚠️  Some endpoints are not working. Check the errors above.');
  }
  
  console.log('\n💡 Tips:');
  console.log('- If you see 404 errors, check your route configuration');
  console.log('- If you see 500 errors, check your database connection');
  console.log('- Make sure your server is running and accessible');
}

// Handle command line arguments
if (process.argv[2]) {
  process.env.API_URL = process.argv[2];
  console.log(`🔧 Using custom API URL: ${process.env.API_URL}\n`);
}

runTests().catch(console.error);
