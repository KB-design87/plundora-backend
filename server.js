const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Plundora API is running!' });
});

// Create payment intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { saleData } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 799, // $7.99
      currency: 'usd',
      metadata: {
        saleTitle: saleData.title,
        saleType: saleData.type
      },
      description: `Plundora Sale Listing: ${saleData.title}`
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

// Webhook endpoint (for later)
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    // For now, just acknowledge receipt
    res.json({received: true});
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Plundora server running on port ${PORT}`);
});
