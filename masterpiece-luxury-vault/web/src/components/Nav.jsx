import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Nav.css';

export default function Nav() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="nav__mark">
          <span className="nav__mark-title">Masterpiece</span>
          <span className="nav__mark-sub">Luxury Vault</span>
        </Link>

        <nav className="nav__links">
          <Link to="/products/watch">Watches</Link>
          <Link to="/products/ring">Rings</Link>
          <Link to="/products/chain">Chains</Link>
        </nav>

        <div className="nav__actions">
          {isAuthenticated ? (
            <>
              <Link to="/orders" className="nav__account">
                {user?.email}
              </Link>
              <button className="nav__link-btn" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
          <Link to="/cart" className="nav__cart">
            Cart
            {itemCount > 0 && <span className="nav__cart-count">{itemCount}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
