import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api/client';
import './Orders.css';

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

const STATUS_LABELS = {
  pending: 'Pending payment',
  paid: 'Paid',
  failed: 'Payment failed',
  shipped: 'Shipped',
  cancelled: 'Cancelled',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrders()
      .then((data) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container orders-page__status">Loading orders…</div>;

  if (orders.length === 0) {
    return (
      <div className="container orders-page__empty">
        <h1>No orders yet</h1>
        <p>Your order history will appear here once you make a purchase.</p>
        <Link to="/products/watch" className="btn btn--brass">Browse the catalog</Link>
      </div>
    );
  }

  return (
    <div className="container orders-page">
      <h1>Order history</h1>
      <div className="orders-list">
        {orders.map((order) => (
          <Link to={`/orders/${order.id}`} key={order.id} className="order-row">
            <span className="order-row__id">Order #{order.id}</span>
            <span className={`order-row__status order-row__status--${order.status}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
            <span className="order-row__date">
              {new Date(order.created_at).toLocaleDateString()}
            </span>
            <span className="order-row__total">{formatPrice(order.total_cents)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
