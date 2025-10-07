const https = require('https');

// Replace with your actual Railway backend URL
const BASE_URL = 'https://plundora-backend-production-[YOUR-ID].up.railway.app';

console.log('🧪 Testing Railway API Endpoints...\n');

function testEndpoint(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          url: url
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  const tests = [
    { path: '/', name: 'Root endpoint' },
    { path: '/health', name: 'Health check' },
    { path: '/api/sales', name: 'Sales API' },
    { path: '/api/auth', name: 'Auth API' },
    { path: '/api/stores', name: 'Stores API' },
    { path: '/api/payments', name: 'Payments API' }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const result = await testEndpoint(test.path);
      
      if (result.status === 200) {
        console.log(`✅ ${test.name}: ${result.status} - Working!`);
        if (result.data) {
          try {
            const json = JSON.parse(result.data);
            console.log(`   Response:`, JSON.stringify(json, null, 2).substring(0, 100) + '...');
          } catch (e) {
            console.log(`   Response: ${result.data.substring(0, 100)}...`);
          }
        }
      } else {
        console.log(`❌ ${test.name}: ${result.status} - ${result.data || 'No response'}`);
      }
    } catch (error) {
      console.log(`🚫 ${test.name}: Error - ${error.message}`);
    }
    console.log('');
  }
}

console.log('⚠️  IMPORTANT: Replace [YOUR-ID] in BASE_URL with your actual Railway service URL\n');
runTests();
