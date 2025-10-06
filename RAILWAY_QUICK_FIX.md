# 🚂 Railway Quick Fix Guide - Plundora API

## 🚨 IMMEDIATE ACTION REQUIRED

Your API endpoints are returning 404 because of one of these issues:

### 1. Database Not Connected (MOST LIKELY)
- Railway PostgreSQL service not created
- DATABASE_URL environment variable missing
- Database migrations not run

### 2. Environment Variables Missing
- Required variables not set in Railway dashboard
- JWT_SECRET, DATABASE_URL, etc. missing

### 3. Build/Deployment Issues
- Server not starting properly
- Dependencies not installing

## 🔧 STEP-BY-STEP FIX

### Step 1: Check Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Open your project
3. Check if you have:
   - ✅ Web service (your Node.js app)
   - ❓ PostgreSQL database service

### Step 2: Add PostgreSQL Database
If you don't have a database:
1. Click "New" → "Database" → "PostgreSQL"
2. Wait for it to provision
3. Copy the `DATABASE_URL` from the database service
4. Add it to your web service environment variables

### Step 3: Set Environment Variables
In your web service settings, add these variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@hostname:5432/database
JWT_SECRET=your_super_long_secret_key_here_make_it_random
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_here_also_random
JWT_REFRESH_EXPIRES_IN=30d
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
EMAIL_FROM=noreply@plundora.com
```

### Step 4: Run Database Migrations
After setting DATABASE_URL:
1. Go to your web service
2. Click "Deploy" tab
3. Click "View Logs"
4. In the shell, run: `npm run railway-migrate`

### Step 5: Test Your API
Your API should now be available at:
`https://your-service-name.railway.app`

Test these endpoints:
```bash
# Health check
curl https://your-service-name.railway.app/health

# API endpoints
curl https://your-service-name.railway.app/api/sales
curl https://your-service-name.railway.app/api/auth/register
```

## 🐛 DEBUGGING COMMANDS

Run these locally to debug:
```bash
# Check environment variables
npm run check-env

# Debug Railway deployment
npm run railway-debug

# Test database connection
npm run railway-migrate
```

## 🔍 COMMON ISSUES & FIXES

### Issue: "Cannot GET /api/sales"
**Cause**: Server not running or routes not loaded
**Fix**: Check Railway logs, ensure server starts without errors

### Issue: Database connection timeout
**Cause**: DATABASE_URL incorrect or database not accessible
**Fix**: Verify DATABASE_URL format, ensure PostgreSQL service is running

### Issue: JWT_SECRET not set
**Cause**: Missing JWT_SECRET environment variable
**Fix**: Generate a random secret and add to Railway environment variables

### Issue: Build fails
**Cause**: Dependencies not installing or syntax errors
**Fix**: Check build logs, ensure all files are committed to git

## 📞 IMMEDIATE STEPS

1. **Check Railway Dashboard** - Do you have a PostgreSQL service?
2. **Set DATABASE_URL** - Copy from PostgreSQL service to web service
3. **Run Migrations** - `npm run railway-migrate` in Railway shell
4. **Test Health Check** - Visit `/health` endpoint
5. **Update Frontend** - Point to your Railway URL

## 🎯 EXPECTED RESULT

After following these steps:
- ✅ `/health` returns 200 OK
- ✅ `/api/sales` returns sales data (empty array if no data)
- ✅ `/api/auth/register` accepts POST requests
- ✅ Database connection shows "Connected" in health check

## 🚀 NEXT STEPS

Once API is working:
1. Update your frontend (plundora.com) to use Railway URL
2. Configure Stripe webhooks
3. Test full user registration flow
4. Test payment processing

Your Railway URL will be something like:
`https://plundora-backend-production-xxxx.up.railway.app`

Update your frontend API calls to use this URL instead of localhost.
