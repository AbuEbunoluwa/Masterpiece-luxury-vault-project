import { Link } from 'react-router-dom';
import './ProductCard.css';

function formatPrice(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

// Pulls the 1-2 most identity-defining specs per category, so the card
// reads like a condensed authentication report rather than a generic
// product blurb. Different categories surface different facts because
// that's what actually distinguishes a watch from a ring from a chain.
function keySpecs(product) {
  const d = product.details || {};
  switch (product.category) {
    case 'watch':
      return [d.brand, d.movement && `${d.movement} movement`, d.case_size_mm && `${d.case_size_mm}mm`].filter(Boolean);
    case 'ring':
      return [d.carat_weight && `${d.carat_weight}ct`, d.diamond_cut, d.diamond_clarity].filter(Boolean);
    case 'chain':
      return [d.metal_type, d.chain_style, d.length_inches && `${d.length_inches}"`].filter(Boolean);
    default:
      return [];
  }
}

export default function ProductCard({ product }) {
  const specs = keySpecs(product);

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <div className="product-card__image-wrap">
        <img src={product.primary_image_url} alt={product.name} loading="lazy" />
        <span className="badge-verified product-card__badge">Authenticated</span>
      </div>

      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>

        {specs.length > 0 && (
          <ul className="product-card__specs">
            {specs.map((spec) => (
              <li key={spec}>{spec}</li>
            ))}
          </ul>
        )}

        <div className="product-card__footer">
          <span className="product-card__price">{formatPrice(product.price_cents, product.currency)}</span>
          {product.certification_id && (
            <span className="cert-id">{product.certification_id}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
