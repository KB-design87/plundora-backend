const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');

const db = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateCreatePaymentIntent = [
  body('saleId').isUUID().withMessage('Valid sale ID is required'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('shippingAddress.name').trim().notEmpty().withMessage('Recipient name is required'),
  body('shippingAddress.line1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.postal_code').trim().notEmpty().withMessage('Postal code is required'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Country is required'),
];

// POST /api/payments/create-payment-intent - Create Stripe payment intent
router.post('/create-payment-intent', authenticateToken, validateCreatePaymentIntent, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { saleId, shippingAddress, billingAddress } = req.body;

    // Get sale details
    const saleResult = await db.query(
      `SELECT s.*, u.id as seller_id, u.email as seller_email, u.first_name as seller_first_name
       FROM sales s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1 AND s.status = 'active'`,
      [saleId]
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found or not available'
      });
    }

    const sale = saleResult.rows[0];

    // Check if buyer is not the seller
    if (sale.seller_id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot purchase your own items'
      });
    }

    // Check if sale is already sold
    if (sale.status === 'sold') {
      return res.status(400).json({
        success: false,
        error: 'This item has already been sold'
      });
    }

    // Calculate total amount (price + shipping)
    const totalAmount = Math.round((parseFloat(sale.price) + parseFloat(sale.shipping_cost || 0)) * 100); // Convert to cents

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: undefined, // TODO: Create/get Stripe customer
      metadata: {
        saleId: sale.id,
        sellerId: sale.seller_id,
        buyerId: req.user.id,
        saleTitle: sale.title
      },
      description: `Purchase of ${sale.title}`,
      shipping: {
        name: shippingAddress.name,
        address: {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || null,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country
        }
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Save payment record
    const paymentResult = await db.query(
      `INSERT INTO payments (
        sale_id, buyer_id, seller_id, stripe_payment_intent_id,
        amount, currency, status, shipping_address, billing_address, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        sale.id,
        req.user.id,
        sale.seller_id,
        paymentIntent.id,
        totalAmount / 100, // Store as dollars
        'USD',
        'pending',
        JSON.stringify(shippingAddress),
        JSON.stringify(billingAddress || shippingAddress),
        JSON.stringify({
          saleTitle: sale.title,
          itemPrice: sale.price,
          shippingCost: sale.shipping_cost || 0
        })
      ]
    );

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentId: paymentResult.rows[0].id,
        amount: totalAmount / 100,
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});

// POST /api/payments/webhook - Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent) {
  try {
    await db.transaction(async (client) => {
      // Update payment status
      await client.query(
        `UPDATE payments
         SET status = 'succeeded',
             stripe_charge_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE stripe_payment_intent_id = $2`,
        [paymentIntent.latest_charge, paymentIntent.id]
      );

      // Mark sale as sold
      await client.query(
        `UPDATE sales
         SET status = 'sold',
             sold_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [paymentIntent.metadata.saleId]
      );

      // Update store total sales
      await client.query(
        `UPDATE stores
         SET total_sales = total_sales + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [paymentIntent.metadata.sellerId]
      );

      console.log(`Payment succeeded for sale ${paymentIntent.metadata.saleId}`);
    });
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent) {
  try {
    await db.query(
      `UPDATE payments
       SET status = 'failed',
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    console.log(`Payment failed for sale ${paymentIntent.metadata.saleId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Handle canceled payment
async function handlePaymentCanceled(paymentIntent) {
  try {
    await db.query(
      `UPDATE payments
       SET status = 'canceled',
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );

    console.log(`Payment canceled for sale ${paymentIntent.metadata.saleId}`);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
}

// GET /api/payments - Get user's payments (both as buyer and seller)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type = 'all', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = '';
    let queryParams = [req.user.id];

    switch (type) {
      case 'purchases':
        whereCondition = 'WHERE p.buyer_id = $1';
        break;
      case 'sales':
        whereCondition = 'WHERE p.seller_id = $1';
        break;
      default:
        whereCondition = 'WHERE (p.buyer_id = $1 OR p.seller_id = $1)';
    }

    const query = `
      SELECT
        p.*,
        s.title as sale_title,
        s.price as sale_price,
        s.shipping_cost,
        buyer.first_name as buyer_first_name,
        buyer.last_name as buyer_last_name,
        buyer.email as buyer_email,
        seller.first_name as seller_first_name,
        seller.last_name as seller_last_name,
        seller.email as seller_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'image_url', i.image_url,
              'thumbnail_url', i.thumbnail_url,
              'is_primary', i.is_primary
            )
          ) FILTER (WHERE i.id IS NOT NULL AND i.is_primary = true),
          '[]'
        ) as sale_images
      FROM payments p
      JOIN sales s ON p.sale_id = s.id
      JOIN users buyer ON p.buyer_id = buyer.id
      JOIN users seller ON p.seller_id = seller.id
      LEFT JOIN images i ON s.id = i.sale_id AND i.is_primary = true
      ${whereCondition}
      GROUP BY p.id, s.title, s.price, s.shipping_cost,
               buyer.first_name, buyer.last_name, buyer.email,
               seller.first_name, seller.last_name, seller.email
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      ${whereCondition}
    `;

    const countResult = await db.query(countQuery, [req.user.id]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments'
    });
  }
});

// GET /api/payments/:id - Get specific payment details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        p.*,
        s.title as sale_title,
        s.description as sale_description,
        s.price as sale_price,
        s.shipping_cost,
        s.category,
        buyer.first_name as buyer_first_name,
        buyer.last_name as buyer_last_name,
        buyer.email as buyer_email,
        seller.first_name as seller_first_name,
        seller.last_name as seller_last_name,
        seller.email as seller_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'image_url', i.image_url,
              'thumbnail_url', i.thumbnail_url,
              'is_primary', i.is_primary,
              'display_order', i.display_order
            ) ORDER BY i.display_order
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) as sale_images
      FROM payments p
      JOIN sales s ON p.sale_id = s.id
      JOIN users buyer ON p.buyer_id = buyer.id
      JOIN users seller ON p.seller_id = seller.id
      LEFT JOIN images i ON s.id = i.sale_id
      WHERE p.id = $1 AND (p.buyer_id = $2 OR p.seller_id = $2)
      GROUP BY p.id, s.title, s.description, s.price, s.shipping_cost, s.category,
               buyer.first_name, buyer.last_name, buyer.email,
               seller.first_name, seller.last_name, seller.email
    `;

    const result = await db.query(query, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment'
    });
  }
});

// POST /api/payments/:id/refund - Request/process refund
router.post('/:id/refund', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get payment details
    const paymentResult = await db.query(
      `SELECT p.*, s.title as sale_title
       FROM payments p
       JOIN sales s ON p.sale_id = s.id
       WHERE p.id = $1 AND (p.buyer_id = $2 OR p.seller_id = $2)`,
      [id, req.user.id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Only successful payments can be refunded'
      });
    }

    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      reason: 'requested_by_customer',
      metadata: {
        reason: reason || 'Customer requested refund',
        refunded_by: req.user.id
      }
    });

    // Update payment status
    await db.query(
      `UPDATE payments
       SET status = 'refunded',
           metadata = jsonb_set(
             COALESCE(metadata, '{}'),
             '{refund}',
             $1::jsonb
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [
        JSON.stringify({
          refund_id: refund.id,
          refund_amount: refund.amount / 100,
          refund_reason: reason,
          refunded_at: new Date().toISOString()
        }),
        id
      ]
    );

    // Update sale status back to active
    await db.query(
      'UPDATE sales SET status = $1, sold_at = NULL WHERE id = $2',
      ['active', payment.sale_id]
    );

    res.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund'
    });
  }
});

// GET /api/payments/analytics/summary - Get payment analytics (for sellers)
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days

    const query = `
      SELECT
        COUNT(*) as total_sales,
        SUM(amount) as total_revenue,
        AVG(amount) as average_sale,
        COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_sales,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sales,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_sales
      FROM payments
      WHERE seller_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '${period} days'
    `;

    const result = await db.query(query, [req.user.id]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment analytics'
    });
  }
});

module.exports = router;