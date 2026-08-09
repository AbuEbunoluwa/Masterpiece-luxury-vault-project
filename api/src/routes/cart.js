const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const cart = require('../models/cart');

// All cart routes require a logged-in user — cart is always scoped to req.user.id
router.use(requireAuth);

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    const contents = await cart.getCartContents(req.user.id);
    res.json(contents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /api/cart/items  { productId, quantity }
router.post('/items', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }
    const contents = await cart.addItem(req.user.id, productId, quantity || 1);
    res.status(201).json(contents);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/cart/items/:productId  { quantity }
router.patch('/items/:productId', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ error: 'quantity is required' });
    }
    const contents = await cart.updateItemQuantity(req.user.id, req.params.productId, quantity);
    res.json(contents);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/cart/items/:productId
router.delete('/items/:productId', async (req, res) => {
  try {
    const contents = await cart.removeItem(req.user.id, req.params.productId);
    res.json(contents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

module.exports = router;
