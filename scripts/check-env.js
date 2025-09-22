require('dotenv').config();

// Required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

// Optional but recommended environment variables
const recommendedEnvVars = [
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'FRONTEND_URL',
  'NODE_ENV'
];

console.log('🔍 Checking environment variables...\n');

let allRequired = true;
let hasRecommended = 0;

// Check required variables
console.log('📋 Required Variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ?
    (varName.includes('SECRET') || varName.includes('PASSWORD') ? '[HIDDEN]' : value.substring(0, 20) + '...') :
    'NOT SET';

  console.log(`  ${status} ${varName}: ${displayValue}`);

  if (!value) {
    allRequired = false;
  }
});

console.log('\n📋 Recommended Variables:');
recommendedEnvVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️ ';
  const displayValue = value ?
    (varName.includes('SECRET') || varName.includes('PASSWORD') ? '[HIDDEN]' : value.substring(0, 20) + '...') :
    'NOT SET';

  console.log(`  ${status} ${varName}: ${displayValue}`);

  if (value) {
    hasRecommended++;
  }
});

console.log('\n📊 Summary:');
console.log(`Required variables: ${requiredEnvVars.filter(v => process.env[v]).length}/${requiredEnvVars.length}`);
console.log(`Recommended variables: ${hasRecommended}/${recommendedEnvVars.length}`);

if (!allRequired) {
  console.log('\n❌ Missing required environment variables!');
  console.log('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');

  if (hasRecommended < recommendedEnvVars.length) {
    console.log('⚠️  Some recommended variables are missing. The app will work but may have limited functionality.');
  } else {
    console.log('🎉 All recommended environment variables are also set!');
  }
}

// Additional checks
console.log('\n🔧 Additional Checks:');

// Check JWT secret strength
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret && jwtSecret.length < 32) {
  console.log('⚠️  JWT_SECRET should be at least 32 characters long for security');
} else if (jwtSecret) {
  console.log('✅ JWT_SECRET length is adequate');
}

// Check if in production mode
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Running in production mode');

  // Additional production checks
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.log('⚠️  Email configuration missing - notifications will not work');
  }

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')) {
    console.log('⚠️  Using localhost database in production mode');
  }
} else {
  console.log('🔧 Running in development mode');
}

console.log('\n🚀 Environment check complete!');