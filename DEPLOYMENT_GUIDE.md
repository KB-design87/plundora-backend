# 🚀 Plundora Deployment Guide - Render + PostgreSQL

## Step 1: Prepare for Deployment

### 1.1 Initialize Git Repository
```bash
cd C:\Users\burke\Desktop\Plundora
git init
git add .
git commit -m "Initial Plundora backend setup"
```

### 1.2 Create GitHub Repository
1. Go to GitHub.com and create a new repository named "plundora-backend"
2. Make it private (recommended for production code)
3. Push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/plundora-backend.git
git branch -M main
git push -u origin main
```

## Step 2: Set Up Render Account

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your GitHub account

## Step 3: Create PostgreSQL Database

### 3.1 Create Database on Render
1. In Render Dashboard, click "New +"
2. Select "PostgreSQL"
3. Configure:
   - **Name**: `plundora-db`
   - **Database**: `plundora`
   - **User**: `plundora_user`
   - **Region**: Choose closest to your users
   - **Plan**: Start with "Free" (can upgrade later)

4. Click "Create Database"
5. **SAVE THE DATABASE URL** - you'll need it for environment variables

### 3.2 Get Database Connection Details
After creation, you'll see:
- **External Database URL**: `postgresql://username:password@hostname:5432/database`
- **Internal Database URL**: For connecting from Render services
- Copy the **External Database URL** for your `.env` file

## Step 4: Deploy Backend to Render

### 4.1 Create Web Service
1. In Render Dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository "plundora-backend"
4. Configure:
   - **Name**: `plundora-api`
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Start with "Free" tier

### 4.2 Set Environment Variables
In the "Environment" section, add these variables:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=[YOUR_POSTGRES_URL_FROM_STEP_3]
JWT_SECRET=plundora_super_secret_jwt_key_2024_make_this_very_long_and_random_abc123xyz789
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=plundora_refresh_token_secret_2024_also_very_long_and_random_def456uvw012
JWT_REFRESH_EXPIRES_IN=30d
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=[YOUR_STRIPE_WEBHOOK_SECRET]
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=[YOUR_EMAIL]
EMAIL_PASSWORD=[YOUR_GMAIL_APP_PASSWORD]
EMAIL_FROM=noreply@plundora.com
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,webp
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://plundora.com,https://www.plundora.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
FRONTEND_URL=https://plundora.com
GOOGLE_MAPS_API_KEY=[YOUR_GOOGLE_MAPS_KEY]
LOG_LEVEL=info
```

### 4.3 Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Your API will be available at: `https://plundora-api.onrender.com`

## Step 5: Set Up Database Tables

### 5.1 Run Database Migrations
Once deployed, you need to create the database tables:

1. Go to your Render service dashboard
2. Click on "Shell" tab
3. Run: `npm run migrate`

Or manually connect to your database and run the SQL from `database/schema.sql`

## Step 6: Configure Stripe Webhooks

### 6.1 Set Up Stripe Webhook
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to "Developers" → "Webhooks"
3. Click "Add endpoint"
4. Set URL: `https://plundora-api.onrender.com/api/payments/webhook`
5. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
6. Copy the webhook secret and add to environment variables

## Step 7: Get Required API Keys

### 7.1 Stripe Keys (REQUIRED)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to "Developers" → "API keys"
3. Copy:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

### 7.2 Gmail App Password (REQUIRED for emails)
1. Go to [Google Account Settings](https://myaccount.google.com)
2. Security → 2-Step Verification → App passwords
3. Generate app password for "Mail"
4. Use this password in EMAIL_PASSWORD

### 7.3 Google Maps API Key (OPTIONAL but recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project or select existing
3. Enable "Maps JavaScript API" and "Places API"
4. Create API key
5. Restrict key to your domain

## Step 8: Test Your Deployment

### 8.1 Health Check
Visit: `https://plundora-api.onrender.com/health`

Should return:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123,
  "version": "1.0.0"
}
```

### 8.2 Test API Endpoints
```bash
# Test sales endpoint
curl https://plundora-api.onrender.com/api/sales

# Test registration
curl -X POST https://plundora-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

## Step 9: Update Frontend

### 9.1 Update API URL in Frontend
In your frontend code (plundora.com), change the API base URL from demo to:
```javascript
const API_BASE_URL = 'https://plundora-api.onrender.com/api';
```

## Step 10: Go Live Checklist

### ✅ Before Going Live:
- [ ] Database is created and tables are set up
- [ ] All environment variables are configured
- [ ] Stripe webhook is configured
- [ ] Health check endpoint works
- [ ] Can create and retrieve sales
- [ ] Payment processing works in test mode
- [ ] Email notifications work
- [ ] Frontend connects to backend successfully

### ✅ Production Checklist:
- [ ] Switch Stripe to live mode
- [ ] Update CORS_ORIGIN to your domain
- [ ] Set up monitoring/alerts
- [ ] Configure backup strategy
- [ ] Set up domain SSL certificates
- [ ] Test all critical user flows

## Troubleshooting

### Common Issues:

**1. Database Connection Failed**
- Check DATABASE_URL format
- Ensure database exists
- Check firewall settings

**2. Build Fails**
- Check package.json scripts
- Ensure all dependencies are listed
- Check Node.js version compatibility

**3. Environment Variables Not Working**
- Double-check variable names
- No spaces around `=` in values
- Restart service after changes

**4. CORS Errors**
- Check CORS_ORIGIN setting
- Ensure frontend domain matches
- Check for trailing slashes

## Monitoring & Maintenance

### 1. Check Logs
- Render dashboard → Your service → Logs
- Look for errors and performance issues

### 2. Database Monitoring
- Monitor connection pool usage
- Check for slow queries
- Regular backups (Render provides automatic backups)

### 3. Performance
- Monitor API response times
- Check memory usage
- Scale up if needed

## Scaling Options

### When to Scale:
- Response times > 2 seconds
- High error rates
- Database connection limits reached

### Scaling Steps:
1. **Render Plan**: Upgrade to Standard or Pro
2. **Database**: Upgrade PostgreSQL plan
3. **Caching**: Add Redis for frequently accessed data
4. **CDN**: Use Cloudflare for static assets

---

## 🎉 Congratulations!

Your Plundora backend is now live and ready to handle real users and payments!

**Your API is now available at:** `https://plundora-api.onrender.com`

Remember to update your frontend to use this new API endpoint and you'll be fully operational!