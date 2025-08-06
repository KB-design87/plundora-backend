// server.js - Complete Fixed Version for Plundora Backend
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_TEST_KEY');

const app = express();

// CRITICAL: CORS Configuration (MUST BE FIRST)
app.use(cors({
    origin: '*', // Allow all origins for now
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.static('public'));

// Test endpoint - MUST HAVE THIS
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'Plundora API is live!',
        version: '1.0.0',
        timestamp: new Date()
    });
});

// Basic root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Plundora Backend API' });
});

// Create payment intent endpoint
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { paymentMethodId, saleData } = req.body;
        
        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 799, // $7.99 in cents
            currency: 'usd',
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            },
            metadata: {
                saleTitle: saleData.title,
                saleType: saleData.type,
                state: saleData.state
            }
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Payment intent error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get nearby sales endpoint (returns dummy data for now)
app.get('/api/sales/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 50 } = req.query;
        
        // For now, return dummy data
        const dummySales = [
            {
                id: '1',
                type: 'yard',
                title: 'Big Yard Sale - Everything Must Go!',
                description: 'Furniture, electronics, books, and more',
                location: {
                    lat: parseFloat(lat) + 0.01,
                    lng: parseFloat(lng) + 0.01,
                    address: '123 Main St'
                },
                distance: 1.2,
                dates: {
                    startDate: new Date(),
                    startTime: '9:00 AM',
                    endTime: '3:00 PM'
                },
                metadata: {
                    views: 45,
                    interested: 12
                }
            },
            {
                id: '2',
                type: 'estate',
                title: 'Estate Sale - Antiques & Collectibles',
                description: 'Beautiful antique furniture and rare collectibles',
                location: {
                    lat: parseFloat(lat) - 0.02,
                    lng: parseFloat(lng) + 0.015,
                    address: '456 Oak Ave'
                },
                distance: 2.5,
                dates: {
                    startDate: new Date(),
                    startTime: '8:00 AM',
                    endTime: '5:00 PM'
                },
                metadata: {
                    views: 89,
                    interested: 23,
                    featured: true
                }
            }
        ];
        
        res.json({ sales: dummySales });
    } catch (error) {
        console.error('Error fetching nearby sales:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search sales endpoint
app.get('/api/sales/search', async (req, res) => {
    try {
        const { q, state, type } = req.query;
        
        // Dummy search results
        const results = [
            {
                id: '3',
                type: type || 'yard',
                title: `Search result for: ${q}`,
                description: 'Great items matching your search',
                location: {
                    state: state || 'Unknown',
                    address: '789 Search St'
                },
                distance: 3.5,
                dates: {
                    startDate: new Date(),
                    startTime: '10:00 AM'
                }
            }
        ];
        
        res.json({ 
            sales: results,
            total: results.length 
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get sale by ID
app.get('/api/sales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Dummy sale data
        const sale = {
            id: id,
            type: 'estate',
            title: 'Estate Sale - Victorian Mansion',
            description: 'Incredible collection of antiques from a historic Victorian estate.',
            location: {
                address: '100 Victorian Lane',
                state: 'California',
                lat: 34.0522,
                lng: -118.2437
            },
            dates: {
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                startTime: '9:00 AM',
                endTime: '4:00 PM'
            },
            metadata: {
                views: 234,
                interested: 45,
                featured: true
            }
        };
        
        res.json({ sale });
    } catch (error) {
        console.error('Error fetching sale:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get featured sales
app.get('/api/sales/featured', async (req, res) => {
    try {
        const featuredSales = [
            {
                id: '4',
                type: 'estate',
                title: 'Premium Estate Sale',
                description: 'High-end furniture and collectibles',
                metadata: { featured: true, views: 500 }
            }
        ];
        
        res.json({ sales: featuredSales });
    } catch (error) {
        console.error('Error fetching featured sales:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// IMPORTANT: Use Railway's PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Plundora server running on port ${PORT}`);
});
