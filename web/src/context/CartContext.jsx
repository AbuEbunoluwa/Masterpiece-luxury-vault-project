import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as api from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotalCents: 0 });
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [], subtotalCents: 0 });
      return;
    }
    setLoading(true);
    try {
      const data = await api.getCart();
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(async (productId, quantity = 1) => {
    const data = await api.addToCart(productId, quantity);
    setCart(data);
    return data;
  }, []);

  const updateItem = useCallback(async (productId, quantity) => {
    const data = await api.updateCartItem(productId, quantity);
    setCart(data);
    return data;
  }, []);

  const removeItem = useCallback(async (productId) => {
    const data = await api.removeCartItem(productId);
    setCart(data);
    return data;
  }, []);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, loading, itemCount, refreshCart, addItem, updateItem, removeItem }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
