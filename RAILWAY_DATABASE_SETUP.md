# 🗄️ Railway Database Setup - Step by Step

## 🚨 Current Issue
Your logs show: **"Connection terminated due to connection timeout"**

This means your app is trying to connect to a database that either:
- Doesn't exist on Railway
- Has wrong connection string
- Hasn't been migrated yet

## 🔧 Step-by-Step Fix

### Step 1: Create PostgreSQL Database on Railway

1. **Go to Railway Dashboard**
   - Visit: [railway.app](https://railway.app)
   - Sign in to your account
   - Open your Plundora project

2. **Add PostgreSQL Service**
   - Click **"New"** button (top right)
   - Select **"Database"**
   - Choose **"PostgreSQL"**
   - Wait for provisioning (1-2 minutes)

3. **Verify Database Created**
   - You should see a new PostgreSQL service in your project
   - Status should be "Active"

### Step 2: Get Database Connection String

1. **Click on PostgreSQL Service** (not your web service)
2. **Go to "Connect" tab**
3. **Copy the "Connection URL"**
   - Format: `postgresql://postgres:password@hostname:5432/railway`
   - **IMPORTANT**: Copy the entire URL

### Step 3: Configure Environment Variables

1. **Go to your Web Service** (Node.js app)
2. **Click "Variables" tab**
3. **Add/Update these variables:**

```env
DATABASE_URL=postgresql://postgres:password@hostname:5432/railway
NODE_ENV=production
JWT_SECRET=plundora_super_secret_jwt_key_2024_make_this_very_long_and_random_abc123xyz789
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=plundora_refresh_token_secret_2024_also_very_long_and_random_def456uvw012
JWT_REFRESH_EXPIRES_IN=30d
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
EMAIL_FROM=noreply@plundora.com
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,webp
BCRYPT_ROUNDS=12
```

**⚠️ IMPORTANT**: Replace `your_stripe_key_here` with your actual Stripe keys!

### Step 4: Run Database Migrations

1. **Go to Web Service → "Deploy" tab**
2. **Click "View Logs"** (opens shell)
3. **Run migration command:**
   ```bash
   npm run railway-migrate
   ```

### Step 5: Test Database Connection

In the Railway shell, run:
```bash
npm run test-database
```

Expected output:
```
✅ Database connection successful!
⏰ Current time: 2024-01-01 12:00:00
🐘 PostgreSQL version: PostgreSQL 15.x
📊 Tables found: 8
✅ Tables: users, stores, sales, images, payments, reviews, favorites, messages
🎉 Database is ready! Your API should work now.
```

### Step 6: Test API Endpoints

After successful migration, test your API:
```bash
# Health check
curl https://your-service-name.railway.app/health

# API endpoints
curl https://your-service-name.railway.app/api/sales
curl https://your-service-name.railway.app/api/stores
```

## 🔍 Troubleshooting

### Issue: "Connection terminated due to connection timeout"
**Solution**: 
1. Verify PostgreSQL service is created and running
2. Check DATABASE_URL format
3. Ensure environment variables are saved

### Issue: "relation does not exist"
**Solution**: Run database migrations:
```bash
npm run railway-migrate
```

### Issue: "authentication failed"
**Solution**: 
1. Check DATABASE_URL credentials
2. Copy connection string again from Railway dashboard

### Issue: "ENOTFOUND" or "ECONNREFUSED"
**Solution**: 
1. Verify PostgreSQL service hostname
2. Check if service is active in Railway dashboard

## 🧪 Testing Commands

Run these in Railway shell to verify setup:

```bash
# Test database connection
npm run test-database

# Test all API endpoints
npm run test-api

# Check environment variables
npm run check-env

# Debug Railway deployment
npm run railway-debug
```

## ✅ Success Checklist

After completing setup, you should see:

- [ ] PostgreSQL service created and active
- [ ] DATABASE_URL environment variable set
- [ ] Database migrations completed successfully
- [ ] `/health` endpoint returns "Connected" for database
- [ ] `/api/sales` returns data (empty array is OK)
- [ ] `/api/stores` returns data
- [ ] No more "Connection terminated" errors in logs

## 🎯 Expected Results

### Health Check Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123,
  "version": "1.0.0",
  "database": "Connected",
  "databaseError": null
}
```

### API Endpoints:
- ✅ `GET /health` - Returns 200 OK
- ✅ `GET /api/sales` - Returns sales data
- ✅ `GET /api/stores` - Returns stores data
- ✅ `POST /api/auth/register` - Accepts user registration

## 🚀 Next Steps

Once database is working:
1. **Update frontend** to use Railway URL
2. **Configure Stripe webhooks**
3. **Test user registration flow**
4. **Test payment processing**

Your Railway URL will be:
`https://your-service-name.railway.app`

## 📞 Need Help?

If you're still having issues:
1. Check Railway logs for errors
2. Run `npm run railway-debug` for diagnostics
3. Verify all environment variables are set
4. Ensure PostgreSQL service is active

The database setup is the final step to get your Plundora API fully operational! 🎉
