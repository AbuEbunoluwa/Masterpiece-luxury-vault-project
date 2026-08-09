import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api/client';
import ProductCard from '../components/ProductCard';
import './Home.css';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts({ limit: 6 })
      .then((data) => setFeatured(data.products))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="hero">
        <div className="container hero__inner">
          <span className="hero__eyebrow">Est. Provenance, Not Just Price</span>
          <h1 className="hero__title">
            Every piece arrives with<br />its own paper trail.
          </h1>
          <p className="hero__lede">
            Masterpiece Luxury Vault authenticates every timepiece, ring, and chain
            before it reaches you — certification included, not upsold.
          </p>
          <div className="hero__actions">
            <Link to="/products/watch" className="btn btn--brass">Browse watches</Link>
            <Link to="/products/ring" className="btn btn--ghost-dark">Browse diamonds</Link>
          </div>
        </div>
      </section>

      <section className="container featured">
        <div className="featured__header">
          <h2>Recently authenticated</h2>
          <span className="cert-id">{featured.length} pieces verified this week</span>
        </div>

        {loading ? (
          <p className="featured__loading">Loading catalog…</p>
        ) : (
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
