console.log('🔍 Checking Railway Environment Variables...');

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0);

if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 20) + '...');
}

console.log('PORT:', process.env.PORT);
console.log('All environment variables:', Object.keys(process.env).filter(key => key.includes('RAILWAY') || key.includes('DATABASE') || key.includes('NODE')));
