import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Cart.css';

function formatPrice(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export default function Cart() {
  const { cart, updateItem, removeItem, loading } = useCart();
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState(null);

  async function handleQuantityChange(productId, quantity) {
    setError(null);
    setPendingId(productId);
    try {
      await updateItem(productId, quantity);
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  async function handleRemove(productId) {
    setError(null);
    setPendingId(productId);
    try {
      await removeItem(productId);
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  if (loading && cart.items.length === 0) {
    return <div className="container cart-page__status">Loading cart…</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="container cart-page__empty">
        <h1>Your cart is empty</h1>
        <p>Browse the catalog to find your next piece.</p>
        <Link to="/products/watch" className="btn btn--brass">Browse watches</Link>
      </div>
    );
  }

  return (
    <div className="container cart-page">
      <h1>Your cart</h1>

      {error && <p className="cart-page__error">{error}</p>}

      <div className="cart-list">
        {cart.items.map((item) => (
          <div key={item.cart_item_id} className="cart-item">
            <img src={item.primary_image_url} alt={item.name} className="cart-item__image" />
            <div className="cart-item__info">
              <Link to={`/product/${item.slug}`} className="cart-item__name">{item.name}</Link>
              <span className="cert-id">${(item.price_cents / 100).toLocaleString()} each</span>
            </div>

            <div className="cart-item__quantity">
              <label htmlFor={`qty-${item.product_id}`}>Qty</label>
              <select
                id={`qty-${item.product_id}`}
                value={item.quantity}
                disabled={pendingId === item.product_id}
                onChange={(e) => handleQuantityChange(item.product_id, parseInt(e.target.value, 10))}
              >
                {Array.from({ length: Math.min(item.stock_quantity, 10) || 1 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <span className="cart-item__total">{formatPrice(item.price_cents * item.quantity, item.currency)}</span>

            <button
              className="cart-item__remove"
              onClick={() => handleRemove(item.product_id)}
              disabled={pendingId === item.product_id}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-summary__row">
          <span>Subtotal</span>
          <span className="cart-summary__total">{formatPrice(cart.subtotalCents)}</span>
        </div>
        <p className="cart-summary__note">Taxes and shipping calculated at checkout.</p>
        <button className="btn btn--brass btn--full" onClick={() => navigate('/checkout')}>
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}
