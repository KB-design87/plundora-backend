# Plundora Backend API

A production-ready Node.js backend for the Plundora marketplace platform, built with Express.js and PostgreSQL.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens
- **User Management**: Registration, login, profile management, email verification
- **Store Management**: Create and manage seller stores with custom URLs
- **Sales & Listings**: Full CRUD operations for marketplace listings
- **Image Upload**: Multiple image upload with automatic optimization and thumbnails
- **Payment Processing**: Stripe integration for secure payments
- **Real-time Messaging**: Buyer-seller communication system
- **Reviews & Ratings**: User review and rating system
- **Advanced Search**: Filter and search with pagination
- **Email Notifications**: Automated email notifications for key events
- **Security**: Rate limiting, input validation, SQL injection protection
- **Production Ready**: Error handling, logging, health checks

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 14+
- **Authentication**: JWT with bcryptjs
- **Payments**: Stripe
- **Image Processing**: Sharp
- **Email**: Nodemailer
- **Validation**: Joi + express-validator
- **Security**: Helmet, CORS, rate limiting

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 14 or higher
- Stripe account (for payments)
- SMTP server or email service (for notifications)

## 🔧 Installation

1. **Clone and navigate to the project:**
   ```bash
   cd C:\Users\burke\Desktop\Plundora
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration values.

4. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb plundora

   # Run migrations
   npm run migrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## 🌍 Environment Variables

Copy `.env.example` to `.env` and configure the following:

### Required Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/plundora

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Optional Variables

```env
NODE_ENV=development
PORT=3001
BCRYPT_ROUNDS=12
MAX_FILE_SIZE=10485760
FRONTEND_URL=https://plundora.com
```

## 🗃️ Database Schema

The database includes the following main tables:

- **users**: User accounts and authentication
- **stores**: Seller stores with custom URLs
- **sales**: Product listings and sales
- **images**: Product images with thumbnails
- **payments**: Stripe payment records
- **reviews**: User reviews and ratings
- **favorites**: User favorites/wishlist
- **messages**: Buyer-seller communication
- **categories**: Product categories hierarchy

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Sales
- `GET /api/sales` - Get all sales with filtering/pagination
- `GET /api/sales/:id` - Get single sale
- `POST /api/sales` - Create new sale (auth required)
- `PUT /api/sales/:id` - Update sale (owner/admin only)
- `DELETE /api/sales/:id` - Delete sale (owner/admin only)
- `POST /api/sales/:id/favorite` - Toggle favorite (auth required)

### Stores
- `GET /api/stores` - Get all stores with filtering
- `GET /api/stores/:slug` - Get store by URL slug
- `POST /api/stores` - Create store (auth required)
- `PUT /api/stores/:id` - Update store (owner/admin only)
- `DELETE /api/stores/:id` - Delete store (owner/admin only)
- `GET /api/stores/my/store` - Get current user's store

### Payments
- `POST /api/payments/create-payment-intent` - Create Stripe payment
- `POST /api/payments/webhook` - Stripe webhook handler
- `GET /api/payments` - Get user's payment history
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/:id/refund` - Process refund

### Utilities
- `GET /health` - Health check endpoint
- `GET /` - API information

## 🔐 Authentication

The API uses JWT tokens for authentication:

1. **Register/Login**: Receive access token and refresh token
2. **API Requests**: Include `Authorization: Bearer <access_token>` header
3. **Token Refresh**: Use refresh token to get new access token
4. **Logout**: Client-side token removal (stateless)

### Token Expiration
- Access tokens: 7 days (configurable)
- Refresh tokens: 30 days (configurable)

## 💳 Payment Processing

Stripe integration handles all payment processing:

1. **Create Payment Intent**: Generate client secret for frontend
2. **Process Payment**: Stripe handles payment on frontend
3. **Webhook Handler**: Update database when payment succeeds/fails
4. **Automatic Updates**: Sales marked as sold, store stats updated

### Webhook Setup

Configure Stripe webhook endpoint: `https://yourdomain.com/api/payments/webhook`

Required events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

## 📁 File Upload

Images are automatically processed and optimized:

- **Main Images**: Resized to max 1200x1200, WebP format, 85% quality
- **Thumbnails**: 300x300 crop, WebP format, 80% quality
- **Storage**: Local filesystem (configurable for S3/Cloudinary)
- **Limits**: 10MB per file, 10 files per sale

## 🔍 Search & Filtering

Advanced search capabilities:

### Sales Filtering
- Category, price range, condition, location
- Full-text search in title, description, tags
- Sort by price, date, popularity
- Pagination support

### Store Filtering
- Location-based search
- Verified stores filter
- Sort by name, rating, sales count

## 📧 Email Notifications

Automated emails for key events:

- **Welcome Email**: Account verification
- **Password Reset**: Secure password reset links
- **Sale Notifications**: When items are sold
- **Purchase Confirmations**: Order confirmations for buyers
- **Message Alerts**: New message notifications

## 🚀 Production Deployment

### Render Deployment

1. **Connect Repository**: Link your GitHub repository to Render

2. **Environment Variables**: Set all required environment variables in Render dashboard

3. **Build Command**:
   ```bash
   npm install
   ```

4. **Start Command**:
   ```bash
   npm start
   ```

5. **Database Setup**: Use Render's PostgreSQL service or external database

### Vercel Deployment (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Setup

Ensure all environment variables are configured in your deployment platform:

- Database connection string
- JWT secrets
- Stripe keys
- Email configuration
- Frontend URL for CORS

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Test database connection
node -e "require('./db/connection').healthCheck().then(console.log)"

# Test email configuration
node -e "require('./utils/email').testEmailConfig().then(console.log)"
```

## 📊 Monitoring

### Health Check

The API provides a health check endpoint at `/health`:

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### Database Monitoring

Check database connection and pool status:

```javascript
const db = require('./db/connection');
console.log(db.getPoolStatus());
```

## 🔒 Security Features

- **Input Validation**: Joi schemas and express-validator
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Helmet middleware
- **Rate Limiting**: Prevents brute force attacks
- **CORS Configuration**: Restricts cross-origin requests
- **Password Hashing**: bcryptjs with configurable rounds
- **JWT Security**: Secure token generation and validation

## 📝 API Response Format

Consistent response format across all endpoints:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... } // For paginated responses
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errors": [ ... ] // For validation errors
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the API documentation
- Review error messages and logs
- Ensure all environment variables are set correctly
- Verify database connection and migrations

## 🔄 Version History

- **v1.0.0**: Initial release with full marketplace functionality

---

**Happy coding! 🚀**