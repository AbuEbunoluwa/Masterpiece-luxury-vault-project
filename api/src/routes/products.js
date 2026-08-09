const express = require('express');
const router = express.Router();
const { listProducts, getProductBySlug, searchProducts } = require('../models/products');

// GET /api/products?category=watch&limit=20&offset=0
router.get('/', async (req, res) => {
  try {
    const { category, limit, offset } = req.query;
    const products = await listProducts({
      category: category || undefined,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/products/search?q=rolex&category=watch
router.get('/search', async (req, res) => {
  try {
    const { q, category } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query param "q" is required' });
    }
    const products = await searchProducts({ query: q, category });
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/products/:slug
router.get('/:slug', async (req, res) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
