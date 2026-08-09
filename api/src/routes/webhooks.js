const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const orders = require('../models/orders');

// POST /api/webhooks/stripe
// This is the ONLY place an order gets marked 'paid'. We never trust the
// frontend telling us "payment succeeded" — Stripe calls this endpoint
// server-to-server once it has actually processed the charge, and we verify
// the request really came from Stripe using the signing secret.
//
// IMPORTANT: this route must receive the raw request body (not JSON-parsed)
// for signature verification to work — see index.js where this is mounted
// with express.raw() BEFORE the global express.json() middleware applies.
router.post('/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await orders.markOrderPaid(paymentIntent.id);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await orders.markOrderFailed(paymentIntent.id);
        break;
      }
      default:
        // Other event types (refunds, disputes, etc.) can be handled here later.
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook event:', err);
    // Return 500 so Stripe retries delivery — we want to know if our own
    // processing failed, rather than silently losing the event.
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
