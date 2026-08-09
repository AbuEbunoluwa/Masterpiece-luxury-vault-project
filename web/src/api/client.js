// Centralized API client. Every request that needs auth automatically
// attaches the stored token, and every response is checked for errors
// in one place — so individual components never hand-roll fetch logic
// or duplicate error handling.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('mlv_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('mlv_token', token);
  } else {
    localStorage.removeItem('mlv_token');
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Surface the API's own error message when available, since routes
    // return specific messages like "Only 2 in stock" that are more
    // useful to the user than a generic "Request failed."
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

// ---- Products ----
export function getProducts({ category } = {}) {
  const query = category ? `?category=${category}` : '';
  return request(`/api/products${query}`);
}

export function getProduct(slug) {
  return request(`/api/products/${slug}`);
}

export function searchProducts(q) {
  return request(`/api/products/search?q=${encodeURIComponent(q)}`);
}

// ---- Auth ----
export function register({ email, password, fullName }) {
  return request('/api/auth/register', { method: 'POST', body: { email, password, fullName } });
}

export function login({ email, password }) {
  return request('/api/auth/login', { method: 'POST', body: { email, password } });
}

// ---- Cart ----
export function getCart() {
  return request('/api/cart', { auth: true });
}

export function addToCart(productId, quantity = 1) {
  return request('/api/cart/items', { method: 'POST', auth: true, body: { productId, quantity } });
}

export function updateCartItem(productId, quantity) {
  return request(`/api/cart/items/${productId}`, { method: 'PATCH', auth: true, body: { quantity } });
}

export function removeCartItem(productId) {
  return request(`/api/cart/items/${productId}`, { method: 'DELETE', auth: true });
}

// ---- Checkout / Orders ----
export function checkout(shippingAddress) {
  return request('/api/checkout', { method: 'POST', auth: true, body: { shippingAddress } });
}

export function getOrders() {
  return request('/api/orders', { auth: true });
}

export function getOrder(id) {
  return request(`/api/orders/${id}`, { auth: true });
}
