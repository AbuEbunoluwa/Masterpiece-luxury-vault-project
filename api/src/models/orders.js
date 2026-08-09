const pool = require('../config/db');

// Creates a 'pending' order from the user's current cart, inside a single
// transaction: re-validates stock (protects against a race where stock
// changed since the item was added to cart), decrements inventory, snapshots
// each item's name/price, and clears the cart — all or nothing.
//
// This does NOT charge the customer. It only reserves stock and creates the
// order record. The actual charge happens via Stripe PaymentIntent, and the
// order is marked 'paid' only when Stripe confirms via webhook — never based
// on what the frontend claims happened client-side.
async function createPendingOrderFromCart(userId, shippingAddress) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cartResult = await client.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (cartResult.rows.length === 0) {
      throw new Error('Cart is empty');
    }
    const cartId = cartResult.rows[0].id;

    // Lock the relevant product rows for the duration of this transaction —
    // prevents two simultaneous checkouts from both succeeding on the last unit of stock.
    const itemsResult = await client.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price_cents, p.stock_quantity, p.is_active
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       FOR UPDATE OF p`,
      [cartId]
    );

    if (itemsResult.rows.length === 0) {
      throw new Error('Cart is empty');
    }

    for (const item of itemsResult.rows) {
      if (!item.is_active) {
        throw new Error(`"${item.name}" is no longer available`);
      }
      if (item.stock_quantity < item.quantity) {
        throw new Error(`Only ${item.stock_quantity} of "${item.name}" left in stock`);
      }
    }

    const totalCents = itemsResult.rows.reduce(
      (sum, item) => sum + item.price_cents * item.quantity,
      0
    );

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total_cents, shipping_address)
       VALUES ($1, 'pending', $2, $3)
       RETURNING *`,
      [userId, totalCents, shippingAddress ? JSON.stringify(shippingAddress) : null]
    );
    const order = orderResult.rows[0];

    for (const item of itemsResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents, product_name_snapshot)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, item.quantity, item.price_cents, item.name]
      );

      // Reserve stock immediately — released back only if payment fails (see markOrderFailed).
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');
    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function attachPaymentIntent(orderId, paymentIntentId) {
  await pool.query(
    'UPDATE orders SET stripe_payment_intent_id = $1, updated_at = now() WHERE id = $2',
    [paymentIntentId, orderId]
  );
}

async function markOrderPaid(paymentIntentId) {
  await pool.query(
    `UPDATE orders SET status = 'paid', updated_at = now()
     WHERE stripe_payment_intent_id = $1`,
    [paymentIntentId]
  );
}

// If payment fails, release the reserved stock back to inventory —
// otherwise a failed payment would permanently "lose" that stock.
async function markOrderFailed(paymentIntentId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT id FROM orders WHERE stripe_payment_intent_id = $1`,
      [paymentIntentId]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }
    const orderId = orderResult.rows[0].id;

    const items = await client.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );
    for (const item of items.rows) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query(
      `UPDATE orders SET status = 'failed', updated_at = now() WHERE id = $1`,
      [orderId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getOrderById(orderId, userId) {
  const result = await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, userId]
  );
  if (result.rows.length === 0) return null;

  const items = await pool.query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [orderId]
  );

  return { ...result.rows[0], items: items.rows };
}

async function listOrdersForUser(userId) {
  const result = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

module.exports = {
  createPendingOrderFromCart,
  attachPaymentIntent,
  markOrderPaid,
  markOrderFailed,
  getOrderById,
  listOrdersForUser,
};
