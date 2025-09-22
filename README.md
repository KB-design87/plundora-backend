# Plundora - Discover Hidden Treasures Nationwide 🏺

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Monetization](#monetization)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [License](#license)

## Overview

Plundora is a modern web application that helps users discover and share information about local sales events including garage sales, estate sales, moving sales, and antique shops. Users can browse nearby sales on an interactive map, post their own sales for a small fee ($7.99), and find hidden treasures in their area.

**Live Demo:** [Coming Soon]

## Features

### Core Features
- 🗺️ **Interactive Map** - Real-time map showing all nearby sales using Leaflet.js
- 📍 **Location-Based Search** - Find sales within a specified radius of your location
- 🔍 **Advanced Filtering** - Filter by sale type, date, distance, and keywords
- 💳 **Stripe Integration** - Secure payment processing for posting listings
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🎨 **Modern Dark Theme** - Eye-catching dark UI with smooth animations
- 📸 **Image Uploads** - Support for multiple images per listing (up to 5)
- 📅 **Calendar Integration** - View sales by date and time
- ⭐ **User Ratings** - Rate and review sales experiences
- 🔔 **Notifications** - Get alerts for new sales in your area

### Planned Features
- 📱 iOS/Android mobile apps
- 👤 User accounts and profiles
- 💬 In-app messaging between buyers and sellers
- 🏷️ Saved searches and favorites
- 📊 Analytics dashboard for sellers
- 🤝 Social sharing integration

## Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom styling with animations
- **JavaScript (ES6+)** - Core functionality
- **Leaflet.js** - Interactive mapping
- **OpenStreetMap** - Map tiles
- **Font Awesome** - Icons

### Backend (Required)
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Stripe API** - Payment processing
- **AWS S3** - Image storage (optional)

### Development Tools
- **Git** - Version control
- **npm** - Package management
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- PostgreSQL (v12.0 or higher)
- Git

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/plundora.git
cd plundora
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up the database**
```bash
# Create a PostgreSQL database
createdb plundora

# Run migrations
npm run migrate
```

4. **Configure environment variables**
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your settings
nano .env
```

5. **Start the development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to `http://localhost:3000`

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/plundora

# Stripe Configuration
STRIPE_PUBLIC_KEY=pk_test_your_public_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# API Configuration
API_BASE_URL=http://localhost:3000/api

# Map Configuration
MAP_DEFAULT_LAT=40.7614
MAP_DEFAULT_LNG=-73.9776
MAP_DEFAULT_ZOOM=13

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AWS S3 Configuration (Optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=plundora-images
AWS_REGION=us-east-1
```

### Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Add them to your `.env` file
4. Configure webhook endpoints in Stripe Dashboard

## Project Structure

```
plundora/
├── public_html/
│   ├── index.html          # Main application file
│   ├── css/
│   │   └── styles.css      # Custom styles
│   ├── js/
│   │   └── app.js          # Application logic
│   └── images/
│       └── logo.png        # Application assets
├── backend/
│   ├── server.js           # Express server
│   ├── routes/
│   │   ├── api.js          # API routes
│   │   └── payments.js     # Stripe endpoints
│   ├── models/
│   │   └── Sale.js         # Database models
│   └── middleware/
│       └── auth.js         # Authentication
├── database/
│   ├── migrations/         # Database migrations
│   └── seeds/              # Sample data
├── .env.example            # Environment template
├── package.json            # Dependencies
├── README.md               # This file
└── LICENSE                 # MIT License
```

## Usage

### For Users

1. **Browse Sales**
   - Open the app and allow location access
   - Browse the map for nearby sales
   - Click markers for details

2. **Search and Filter**
   - Use the search bar for keywords
   - Apply filters by type, date, or distance
   - Sort results by relevance or date

3. **Post a Sale**
   - Click "Post Your Sale"
   - Fill in details and upload images
   - Pay the $7.99 listing fee
   - Your sale appears immediately

### For Developers

1. **Run in development mode**
```bash
npm run dev
```

2. **Build for production**
```bash
npm run build
```

3. **Run tests**
```bash
npm test
```

4. **Lint code**
```bash
npm run lint
```

## API Documentation

### Base URL
```
https://api.plundora.com/v1
```

### Endpoints

#### Get Sales
```http
GET /api/sales
```

**Query Parameters:**
- `lat` - Latitude (required)
- `lng` - Longitude (required)
- `radius` - Search radius in miles (default: 10)
- `type` - Sale type filter
- `startDate` - Filter by start date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "title": "Estate Sale - Vintage Furniture",
      "description": "...",
      "location": {
        "lat": 40.7614,
        "lng": -73.9776,
        "address": "123 Main St"
      },
      "dates": {
        "startDate": "2024-03-15",
        "endDate": "2024-03-17",
        "startTime": "9:00 AM",
        "endTime": "5:00 PM"
      }
    }
  ]
}
```

#### Create Sale
```http
POST /api/sales
```

**Request Body:**
```json
{
  "title": "Moving Sale",
  "description": "Everything must go!",
  "type": "moving",
  "location": {
    "address": "456 Oak St",
    "lat": 40.7614,
    "lng": -73.9776
  },
  "dates": {
    "startDate": "2024-03-20",
    "endDate": "2024-03-21",
    "startTime": "8:00 AM",
    "endTime": "4:00 PM"
  },
  "images": ["image1.jpg", "image2.jpg"],
  "stripeToken": "tok_visa"
}
```

## Deployment

### Deploy to Heroku

1. **Create a Heroku account**
2. **Install Heroku CLI**
3. **Deploy:**
```bash
heroku create plundora-app
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku run npm run migrate
```

### Deploy to AWS

1. **Set up EC2 instance**
2. **Configure RDS for PostgreSQL**
3. **Set up S3 for images**
4. **Deploy using AWS CodeDeploy**

### Deploy to DigitalOcean

1. **Create a droplet**
2. **Set up Nginx**
3. **Configure SSL with Let's Encrypt**
4. **Deploy using PM2**

## Monetization

### Revenue Streams

1. **Listing Fees** - $7.99 per sale posting
2. **Premium Features** (Planned)
   - Featured listings - $19.99
   - Extended listing duration - $9.99
   - Analytics dashboard - $14.99/month
3. **Mobile App** - $2.99 on App Store
4. **Ads** - Local business advertising

### Payment Processing

- Stripe handles all payments securely
- Automatic payouts to your bank account
- Support for international payments
- PCI compliant

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards

- Use ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## Troubleshooting

### Common Issues

**Map not loading**
- Check your internet connection
- Ensure location permissions are granted
- Verify API keys are correct

**Payment failing**
- Verify Stripe keys are correct
- Check if in test mode
- Ensure HTTPS in production

**Images not uploading**
- Check file size (max 5MB)
- Verify allowed formats (JPG, PNG, GIF)
- Check S3 configuration if using

### Debug Mode

Enable debug mode by setting:
```bash
DEBUG=true npm run dev
```

## Support

- 📧 Email: support@plundora.com
- 📝 Documentation: https://docs.plundora.com
- 💬 Discord: https://discord.gg/plundora
- 🐛 Issues: https://github.com/yourusername/plundora/issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- OpenStreetMap contributors for map data
- Stripe for payment processing
- Font Awesome for icons
- The open-source community

---

Made with ❤️ by Kevin Burkett

**Happy Treasure Hunting! 🏺**