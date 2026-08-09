import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '../api/client';
import ProductCard from '../components/ProductCard';
import './Products.css';

const CATEGORY_LABELS = {
  watch: 'Watches',
  ring: 'Rings',
  chain: 'Chains',
};

export default function Products() {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getProducts({ category })
      .then((data) => setProducts(data.products))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [category]);

  const label = CATEGORY_LABELS[category] || 'All Pieces';

  return (
    <div className="container products-page">
      <div className="products-page__header">
        <h1>{label}</h1>
        <p className="products-page__count">
          {loading ? 'Loading…' : `${products.length} authenticated ${products.length === 1 ? 'piece' : 'pieces'}`}
        </p>
      </div>

      {error && <p className="products-page__error">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <div className="products-page__empty">
          <p>No pieces currently listed in this category.</p>
        </div>
      )}

      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
