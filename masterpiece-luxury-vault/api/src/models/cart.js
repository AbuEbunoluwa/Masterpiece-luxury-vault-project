const pool = require('../config/db');

// Every user has exactly one cart (enforced by UNIQUE(user_id) in schema).
// getOrCreateCart makes cart handling idempotent — callers never need to
// check "does this user have a cart yet" themselves.
async function getOrCreateCart(userId) {
  const existing = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) return existing.rows[0];

  const created = await pool.query(
    'INSERT INTO carts (user_id) VALUES ($1) RETURNING *',
    [userId]
  );
  return created.rows[0];
}

// Returns the cart with full product details joined in, plus a computed total.
// This is what the frontend renders directly — no client-side price math,
// so the displayed total always matches what checkout will actually charge.
async function getCartContents(userId) {
  const cart = await getOrCreateCart(userId);

  const result = await pool.query(
    `SELECT ci.id AS cart_item_id, ci.quantity, ci.added_at,
            p.id AS product_id, p.name, p.slug, p.price_cents, p.currency,
            p.primary_image_url, p.stock_quantity, p.is_active
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.added_at ASC`,
    [cart.id]
  );

  const items = result.rows;
  const subtotalCents = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);

  return { cartId: cart.id, items, subtotalCents };
}

// Adds a product to the cart, or increments quantity if it's already in there.
// Checks stock at add-time (not a guarantee against race conditions at checkout —
// checkout re-validates stock again inside a transaction).
async function addItem(userId, productId, quantity = 1) {
  if (quantity < 1) throw new Error('Quantity must be at least 1');

  const product = await pool.query(
    'SELECT id, stock_quantity, is_active FROM products WHERE id = $1',
    [productId]
  );
  if (product.rows.length === 0) throw new Error('Product not found');
  if (!product.rows[0].is_active) throw new Error('Product is not available');
  if (product.rows[0].stock_quantity < quantity) {
    throw new Error(`Only ${product.rows[0].stock_quantity} in stock`);
  }

  const cart = await getOrCreateCart(userId);

  await pool.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
    [cart.id, productId, quantity]
  );

  return getCartContents(userId);
}

// Sets an item's quantity directly (used by a quantity input in the UI).
// Setting quantity to 0 removes the item.
async function updateItemQuantity(userId, productId, quantity) {
  const cart = await getOrCreateCart(userId);

  if (quantity <= 0) {
    await pool.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cart.id, productId]
    );
    return getCartContents(userId);
  }

  const product = await pool.query('SELECT stock_quantity FROM products WHERE id = $1', [productId]);
  if (product.rows.length === 0) throw new Error('Product not found');
  if (product.rows[0].stock_quantity < quantity) {
    throw new Error(`Only ${product.rows[0].stock_quantity} in stock`);
  }

  await pool.query(
    'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3',
    [quantity, cart.id, productId]
  );

  return getCartContents(userId);
}

async function removeItem(userId, productId) {
  const cart = await getOrCreateCart(userId);
  await pool.query(
    'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
    [cart.id, productId]
  );
  return getCartContents(userId);
}

async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
}

module.exports = {
  getOrCreateCart,
  getCartContents,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
};
