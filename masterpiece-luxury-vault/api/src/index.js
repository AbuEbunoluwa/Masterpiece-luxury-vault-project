require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const cartRouter = require('./routes/cart');
const checkoutRouter = require('./routes/checkout');
const ordersRouter = require('./routes/orders');
const webhooksRouter = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// IMPORTANT: the Stripe webhook route needs the RAW request body to verify
// the signature, so it's mounted here with express.raw() before the global
// express.json() below. If this were parsed as JSON first, signature
// verification would always fail. Order of middleware matters in Express.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);

app.use(express.json());

// Health check — used by Kubernetes liveness/readiness probes later.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'masterpiece-luxury-vault-api' });
});

app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);
app.use('/api/cart', cartRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/orders', ordersRouter);
// admin routes get added next

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — catches anything thrown/passed to next(err)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Masterpiece Luxury Vault API running on port ${PORT}`);
});
