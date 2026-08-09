import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './ProductDetail.css';

function formatPrice(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

const SPEC_FIELDS = {
  watch: [
    ['brand', 'Brand'],
    ['model', 'Model'],
    ['movement', 'Movement'],
    ['case_material', 'Case material'],
    ['case_size_mm', 'Case size', (v) => `${v}mm`],
    ['water_resistance_m', 'Water resistance', (v) => `${v}m`],
    ['strap_material', 'Strap'],
    ['year_produced', 'Year'],
  ],
  ring: [
    ['metal_type', 'Metal'],
    ['carat_weight', 'Carat weight', (v) => `${v}ct`],
    ['diamond_cut', 'Cut'],
    ['diamond_clarity', 'Clarity'],
    ['diamond_color', 'Color grade'],
    ['ring_size', 'Ring size'],
    ['setting_style', 'Setting'],
  ],
  chain: [
    ['metal_type', 'Metal'],
    ['chain_style', 'Style'],
    ['length_inches', 'Length', (v) => `${v}"`],
    ['total_carat_weight', 'Total carat weight', (v) => `${v}ct`],
    ['clasp_type', 'Clasp'],
  ],
};

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getProduct(slug)
      .then((data) => setProduct(data.product))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleAddToCart() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/product/${slug}` } });
      return;
    }
    setAdding(true);
    setAddError(null);
    setAdded(false);
    try {
      await addItem(product.id, 1);
      setAdded(true);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <div className="container product-detail__status">Loading…</div>;
  if (error) return <div className="container product-detail__status product-detail__error">{error}</div>;
  if (!product) return null;

  const specFields = SPEC_FIELDS[product.category] || [];
  const specs = specFields
    .map(([key, label, format]) => {
      const value = product.details?.[key];
      if (value === undefined || value === null || value === '') return null;
      return { label, value: format ? format(value) : value };
    })
    .filter(Boolean);

  const outOfStock = product.stock_quantity <= 0;

  return (
    <div className="container product-detail">
      <div className="product-detail__image-wrap">
        <img src={product.primary_image_url} alt={product.name} />
      </div>

      <div className="product-detail__info">
        <span className="badge-verified">Authenticated</span>
        <h1 className="product-detail__name">{product.name}</h1>
        <p className="product-detail__price">{formatPrice(product.price_cents, product.currency)}</p>

        {product.description && <p className="product-detail__description">{product.description}</p>}

        {specs.length > 0 && (
          <div className="spec-sheet">
            <h2 className="spec-sheet__title">Certificate of Specification</h2>
            <dl className="spec-sheet__list">
              {specs.map((spec) => (
                <div key={spec.label} className="spec-sheet__row">
                  <dt>{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
            {product.certification_id && (
              <div className="spec-sheet__cert">
                <span>Certification ID</span>
                <span className="cert-id">{product.certification_id}</span>
              </div>
            )}
          </div>
        )}

        <div className="product-detail__purchase">
          {outOfStock ? (
            <button className="btn btn--ink btn--full" disabled>
              Currently unavailable
            </button>
          ) : (
            <button
              className="btn btn--brass btn--full"
              onClick={handleAddToCart}
              disabled={adding}
            >
              {adding ? 'Adding…' : added ? 'Added to cart ✓' : 'Add to cart'}
            </button>
          )}
          {addError && <p className="product-detail__add-error">{addError}</p>}
          <p className="product-detail__stock">
            {outOfStock ? 'Out of stock' : `${product.stock_quantity} available`}
          </p>
        </div>
      </div>
    </div>
  );
}
