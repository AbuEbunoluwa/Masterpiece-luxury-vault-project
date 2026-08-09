const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const orders = require('../models/orders');

// GET /api/orders — order history for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await orders.listOrdersForUser(req.user.id);
    res.json({ orders: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id — a single order's detail (only if it belongs to the requester)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await orders.getOrderById(req.params.id, req.user.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

module.exports = router;
