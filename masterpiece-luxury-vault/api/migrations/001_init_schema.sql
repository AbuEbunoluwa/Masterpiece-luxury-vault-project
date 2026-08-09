-- Masterpiece Luxury Vault — Initial Schema
-- Design: separate tables per product category (watches, rings, chains),
-- unified under a shared "products" parent table so cart/orders/search
-- can treat all categories uniformly without losing category-specific detail.

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PRODUCTS (parent table — shared fields across all categories)
-- ============================================================
CREATE TYPE product_category AS ENUM ('watch', 'ring', 'chain');

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    category        product_category NOT NULL,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    description     TEXT,
    price_cents     BIGINT NOT NULL CHECK (price_cents > 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    primary_image_url VARCHAR(500),
    certification_id  VARCHAR(100),  -- authenticity/certification reference, fits "trusted marketplace" angle
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_slug ON products(slug);

-- ============================================================
-- WATCHES (category-specific attributes, 1:1 with products)
-- ============================================================
CREATE TABLE watch_details (
    product_id      INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    brand           VARCHAR(100) NOT NULL,
    model           VARCHAR(150),
    movement        VARCHAR(50),          -- e.g. 'automatic', 'quartz', 'manual'
    case_material   VARCHAR(50),          -- e.g. 'stainless steel', '18k gold'
    case_size_mm    NUMERIC(5,2),
    water_resistance_m INTEGER,
    strap_material  VARCHAR(50),
    year_produced   INTEGER
);

-- ============================================================
-- RINGS (category-specific attributes, 1:1 with products)
-- ============================================================
CREATE TABLE ring_details (
    product_id      INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    metal_type      VARCHAR(50),          -- e.g. 'platinum', '18k white gold'
    carat_weight    NUMERIC(5,2),
    diamond_cut     VARCHAR(50),          -- e.g. 'round', 'princess', 'emerald'
    diamond_clarity VARCHAR(10),          -- e.g. 'VVS1', 'VS2'
    diamond_color   VARCHAR(5),           -- e.g. 'D', 'F', 'G'
    ring_size       VARCHAR(10),
    setting_style   VARCHAR(50)           -- e.g. 'solitaire', 'halo', 'pave'
);

-- ============================================================
-- CHAINS (category-specific attributes, 1:1 with products)
-- ============================================================
CREATE TABLE chain_details (
    product_id      INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    metal_type      VARCHAR(50),
    chain_style     VARCHAR(50),          -- e.g. 'cuban link', 'rope', 'tennis'
    length_inches   NUMERIC(4,1),
    total_carat_weight NUMERIC(5,2),
    clasp_type      VARCHAR(50)
);

-- ============================================================
-- CART
-- ============================================================
CREATE TABLE carts (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)  -- one active cart per user
);

CREATE TABLE cart_items (
    id              SERIAL PRIMARY KEY,
    cart_id         INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id),
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(cart_id, product_id)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed', 'shipped', 'cancelled');

CREATE TABLE orders (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    status          order_status NOT NULL DEFAULT 'pending',
    total_cents     BIGINT NOT NULL CHECK (total_cents > 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    stripe_payment_intent_id VARCHAR(255),
    shipping_address JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents BIGINT NOT NULL,   -- snapshot of price at time of purchase
    product_name_snapshot VARCHAR(255) NOT NULL  -- in case product is later edited/removed
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
