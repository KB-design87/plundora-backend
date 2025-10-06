# 🚂 Railway Deployment Guide for Plundora

## Quick Fix for 404 Issues

The most common cause of 404 errors on Railway is missing environment variables or database connection issues.

## Step 1: Railway Configuration

### 1.1 Create railway.json (Already Created)
The `railway.json` file has been created with proper configuration.

### 1.2 Environment Variables Required
Make sure these are set in your Railway dashboard:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_super_long_secret_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=30d
STRIPE_SECRET_KEY=sk_live_or_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@plundora.com
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,webp
BCRYPT_ROUNDS=12
```

## Step 2: Database Setup

### 2.1 Create PostgreSQL Database
1. In Railway dashboard, click "New Project"
2. Add "PostgreSQL" service
3. Copy the `DATABASE_URL` connection string

### 2.2 Run Database Migrations
After deployment, run migrations:
```bash
npm run railway-migrate
```

Or manually in Railway shell:
```bash
node scripts/railway-migrate.js
```

## Step 3: Common 404 Fixes

### Fix 1: Check Build Logs
- Go to Railway dashboard → Your service → Deployments
- Check build logs for errors
- Look for missing dependencies or build failures

### Fix 2: Verify Start Command
Railway should use: `npm start`
Which runs: `node server.js`

### Fix 3: Check Port Configuration
Railway sets `PORT` environment variable automatically.
Your server.js should use: `process.env.PORT || 3001`

### Fix 4: Database Connection
Most 404s happen when database connection fails:
1. Check DATABASE_URL format
2. Ensure database is accessible
3. Run health check: `/health` endpoint

## Step 4: Test Endpoints

### Health Check
```bash
curl https://your-railway-url.railway.app/health
```

### Test API Endpoints
```bash
# Test sales endpoint
curl https://your-railway-url.railway.app/api/sales

# Test auth endpoint
curl https://your-railway-url.railway.app/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

## Step 5: Railway-Specific Settings

### 5.1 Railway Variables
In Railway dashboard, set these variables:
- `NODE_ENV=production`
- `DATABASE_URL` (from PostgreSQL service)
- `JWT_SECRET` (generate a long random string)
- `STRIPE_SECRET_KEY` (your Stripe secret key)

### 5.2 Custom Domain (Optional)
1. Go to Railway dashboard → Your service → Settings
2. Add custom domain: `api.plundora.com`
3. Configure DNS records

## Troubleshooting

### Issue: All endpoints return 404
**Solution**: Check if server is starting properly
- Look at Railway logs
- Verify all dependencies are installed
- Check for syntax errors in server.js

### Issue: Database connection fails
**Solution**: 
- Verify DATABASE_URL format
- Check if PostgreSQL service is running
- Ensure database has been created

### Issue: CORS errors from frontend
**Solution**: Update CORS origin in server.js
```javascript
const allowedOrigins = [
  'https://plundora.com',
  'https://www.plundora.com',
  'https://your-railway-url.railway.app'
];
```

### Issue: Build fails
**Solution**:
- Check package.json scripts
- Ensure all dependencies are listed
- Check Node.js version compatibility

## Quick Deployment Checklist

- [ ] railway.json created ✓
- [ ] Environment variables set
- [ ] PostgreSQL database created
- [ ] Database migrations run
- [ ] Health check endpoint works
- [ ] API endpoints respond
- [ ] CORS configured for frontend domain
- [ ] Stripe webhook configured

## Your Railway URL
Once deployed, your API will be available at:
`https://your-service-name.railway.app`

Update your frontend to use this URL for API calls.
