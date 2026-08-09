const pool = require('../config/db');

// Maps each category to its detail table + join column set.
// This is the one place that "knows" about the per-category schema,
// so routes don't need a giant if/else for every query.
const CATEGORY_TABLES = {
  watch: { table: 'watch_details', columns: 'brand, model, movement, case_material, case_size_mm, water_resistance_m, strap_material, year_produced' },
  ring: { table: 'ring_details', columns: 'metal_type, carat_weight, diamond_cut, diamond_clarity, diamond_color, ring_size, setting_style' },
  chain: { table: 'chain_details', columns: 'metal_type, chain_style, length_inches, total_carat_weight, clasp_type' },
};

// Fetch a page of products, optionally filtered by category, joined with
// category-specific details. Only active (in-stock/listed) products by default.
async function listProducts({ category, limit = 20, offset = 0, includeInactive = false }) {
  if (category && !CATEGORY_TABLES[category]) {
    throw new Error(`Unknown category: ${category}`);
  }

  if (category) {
    const { table, columns } = CATEGORY_TABLES[category];
    const activeClause = includeInactive ? '' : 'AND p.is_active = true';
    const result = await pool.query(
      `SELECT p.*, ${columns}
       FROM products p
       JOIN ${table} d ON d.product_id = p.id
       WHERE p.category = $1 ${activeClause}
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [category, limit, offset]
    );
    return result.rows;
  }

  // No category filter: return base product fields only (no detail join,
  // since each category has different columns — detail page fetches those separately).
  const activeClause = includeInactive ? '' : 'WHERE p.is_active = true';
  const result = await pool.query(
    `SELECT p.* FROM products p ${activeClause}
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

// Fetch a single product with full category-specific details, by slug.
async function getProductBySlug(slug) {
  const base = await pool.query('SELECT * FROM products WHERE slug = $1', [slug]);
  if (base.rows.length === 0) return null;

  const product = base.rows[0];
  const { table, columns } = CATEGORY_TABLES[product.category];

  const details = await pool.query(
    `SELECT ${columns} FROM ${table} WHERE product_id = $1`,
    [product.id]
  );

  return { ...product, details: details.rows[0] || null };
}

// Simple search across product name/description, optionally scoped to a category.
async function searchProducts({ query, category, limit = 20 }) {
  const params = [`%${query}%`];
  let categoryClause = '';

  if (category) {
    params.push(category);
    categoryClause = `AND category = $${params.length}`;
  }

  params.push(limit);

  const result = await pool.query(
    `SELECT * FROM products
     WHERE is_active = true
       AND (name ILIKE $1 OR description ILIKE $1)
       ${categoryClause}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

module.exports = { listProducts, getProductBySlug, searchProducts, CATEGORY_TABLES };
