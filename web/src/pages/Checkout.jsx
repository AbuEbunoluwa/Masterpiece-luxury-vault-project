import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import * as api from '../api/client';
import './Checkout.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function formatPrice(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function PaymentForm({ orderId, totalCents }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { refreshCart } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}`,
      },
    });

    if (stripeError) {
      setError(stripeError.message);
      setSubmitting(false);
    } else {
      await refreshCart();
      navigate(`/orders/${orderId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <PaymentElement />

      {error && <p className="payment-form__error">{error}</p>}

      <button type="submit" className="btn btn--brass btn--full" disabled={!stripe || submitting}>
        {submitting ? 'Processing…' : `Pay ${formatPrice(totalCents)}`}
      </button>

      <p className="payment-form__note">
        This is Stripe test mode. Use card <span className="cert-id">4242 4242 4242 4242</span>,
        any future expiry, any CVC.
      </p>
    </form>
  );
}

export default function Checkout() {
  const { cart } = useCart();
  const [clientSecret, setClientSecret] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [totalCents, setTotalCents] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cart.items.length === 0) {
      setLoading(false);
      return;
    }
    api.checkout()
      .then((data) => {
        setClientSecret(data.clientSecret);
        setOrderId(data.orderId);
        setTotalCents(data.totalCents);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="container checkout-page__status">Preparing checkout…</div>;

  if (cart.items.length === 0) {
    return (
      <div className="container checkout-page__status">
        <p>Your cart is empty.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container checkout-page__status checkout-page__error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container checkout-page">
      <h1>Checkout</h1>

      <div className="checkout-layout">
        <div className="checkout-summary">
          <h2>Order summary</h2>
          <ul>
            {cart.items.map((item) => (
              <li key={item.cart_item_id}>
                <span>{item.name} × {item.quantity}</span>
                <span>{formatPrice(item.price_cents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="checkout-summary__total">
            <span>Total</span>
            <span>{formatPrice(totalCents)}</span>
          </div>
        </div>

        <div className="checkout-payment">
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm orderId={orderId} totalCents={totalCents} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
