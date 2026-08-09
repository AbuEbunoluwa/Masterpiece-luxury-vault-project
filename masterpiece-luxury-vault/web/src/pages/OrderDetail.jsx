import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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

const STATUS_EXPLANATION = {
  pending: 'Waiting for payment confirmation from Stripe. This updates automatically once payment completes — no need to refresh.',
  paid: 'Payment confirmed. This order is being prepared.',
  failed: 'Payment did not go through. The items have been released back into stock.',
  shipped: 'This order is on its way.',
  cancelled: 'This order was cancelled.',
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;

    function fetchOrder() {
      api.getOrder(id)
        .then((data) => {
          setOrder(data.order);
          if (['paid', 'failed', 'shipped', 'cancelled'].includes(data.order.status)) {
            clearInterval(interval);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }

    fetchOrder();
    interval = setInterval(fetchOrder, 3000);

    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <div className="container orders-page__status">Loading order…</div>;
  if (error) return <div className="container orders-page__status">{error}</div>;
  if (!order) return null;

  return (
    <div className="container order-detail">
      <Link to="/orders" className="order-detail__back">← Back to orders</Link>

      <div className="order-detail__header">
        <h1>Order #{order.id}</h1>
        <span className={`order-row__status order-row__status--${order.status}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <p className="order-detail__explanation">{STATUS_EXPLANATION[order.status]}</p>

      <div className="order-detail__items">
        {order.items.map((item) => (
          <div key={item.id} className="order-detail__item">
            <span>{item.product_name_snapshot} × {item.quantity}</span>
            <span>{formatPrice(item.unit_price_cents * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="order-detail__total">
        <span>Total</span>
        <span>{formatPrice(order.total_cents)}</span>
      </div>
    </div>
  );
}
