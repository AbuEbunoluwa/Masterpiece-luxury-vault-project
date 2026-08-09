const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const stripe = require('../config/stripe');
const orders = require('../models/orders');

// POST /api/checkout — creates a pending order from the cart + a Stripe PaymentIntent.
// Frontend uses the returned clientSecret to collect card details via Stripe.js
// and confirm payment directly with Stripe (card details never touch our server).
router.post('/', requireAuth, async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    const order = await orders.createPendingOrderFromCart(req.user.id, shippingAddress);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.total_cents,
      currency: order.currency.toLowerCase(),
      metadata: {
        orderId: order.id.toString(),
        userId: req.user.id.toString(),
      },
    });

    await orders.attachPaymentIntent(order.id, paymentIntent.id);

    res.status(201).json({
      orderId: order.id,
      totalCents: order.total_cents,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
