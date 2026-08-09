-- Seed data — fictional luxury inventory for development/testing.
-- Not real brand partnerships; brand names used descriptively for realism.

-- WATCHES
INSERT INTO products (category, name, slug, description, price_cents, stock_quantity, primary_image_url, certification_id)
VALUES
  ('watch', 'Heritage Chronograph 41mm', 'heritage-chronograph-41mm',
   'A hand-finished automatic chronograph housed in a polished stainless steel case. Every movement is regulated and certified before leaving the workshop.',
   1250000, 4, 'https://placehold.co/600x600?text=Heritage+Chronograph', 'MLV-WT-1001'),
  ('watch', 'Vault Skeleton Automatic', 'vault-skeleton-automatic',
   'An openworked dial reveals the full automatic movement in motion. Finished in 18k rose gold with a sapphire crystal caseback.',
   3890000, 2, 'https://placehold.co/600x600?text=Vault+Skeleton', 'MLV-WT-1002'),
  ('watch', 'Diver Pro 300M', 'diver-pro-300m',
   'Rated to 300 meters, with a unidirectional bezel and luminous markers. Built for the water, finished for the boardroom.',
   680000, 9, 'https://placehold.co/600x600?text=Diver+Pro+300M', 'MLV-WT-1003');

INSERT INTO watch_details (product_id, brand, model, movement, case_material, case_size_mm, water_resistance_m, strap_material, year_produced)
SELECT id, 'Masterpiece Atelier', 'Heritage Chrono', 'automatic', 'stainless steel', 41.0, 100, 'leather', 2025
FROM products WHERE slug = 'heritage-chronograph-41mm';

INSERT INTO watch_details (product_id, brand, model, movement, case_material, case_size_mm, water_resistance_m, strap_material, year_produced)
SELECT id, 'Masterpiece Atelier', 'Vault Skeleton', 'automatic', '18k rose gold', 40.0, 50, 'alligator leather', 2025
FROM products WHERE slug = 'vault-skeleton-automatic';

INSERT INTO watch_details (product_id, brand, model, movement, case_material, case_size_mm, water_resistance_m, strap_material, year_produced)
SELECT id, 'Masterpiece Atelier', 'Diver Pro', 'automatic', 'titanium', 42.0, 300, 'rubber', 2024
FROM products WHERE slug = 'diver-pro-300m';


-- RINGS
INSERT INTO products (category, name, slug, description, price_cents, stock_quantity, primary_image_url, certification_id)
VALUES
  ('ring', 'Solitaire Radiance 2ct', 'solitaire-radiance-2ct',
   'A timeless round brilliant solitaire set in platinum, cut for maximum fire and brilliance. Independently graded and certified.',
   2450000, 3, 'https://placehold.co/600x600?text=Solitaire+Radiance', 'MLV-RG-2001'),
  ('ring', 'Halo Eternity Band', 'halo-eternity-band',
   'A central emerald-cut diamond encircled by a halo of pavé stones, set in 18k white gold.',
   1875000, 5, 'https://placehold.co/600x600?text=Halo+Eternity', 'MLV-RG-2002');

INSERT INTO ring_details (product_id, metal_type, carat_weight, diamond_cut, diamond_clarity, diamond_color, ring_size, setting_style)
SELECT id, 'platinum', 2.00, 'round', 'VVS1', 'D', '6', 'solitaire'
FROM products WHERE slug = 'solitaire-radiance-2ct';

INSERT INTO ring_details (product_id, metal_type, carat_weight, diamond_cut, diamond_clarity, diamond_color, ring_size, setting_style)
SELECT id, '18k white gold', 1.50, 'emerald', 'VS1', 'F', '6.5', 'halo'
FROM products WHERE slug = 'halo-eternity-band';


-- CHAINS
INSERT INTO products (category, name, slug, description, price_cents, stock_quantity, primary_image_url, certification_id)
VALUES
  ('chain', 'Cuban Link Diamond Chain 18"', 'cuban-link-diamond-chain-18',
   'A bold cuban link chain fully iced with pavé-set diamonds, finished in 14k gold.',
   3200000, 2, 'https://placehold.co/600x600?text=Cuban+Link+Chain', 'MLV-CH-3001'),
  ('chain', 'Tennis Chain Classic 20"', 'tennis-chain-classic-20',
   'A single continuous line of matched round brilliant diamonds, individually prong-set in 18k gold.',
   4650000, 1, 'https://placehold.co/600x600?text=Tennis+Chain', 'MLV-CH-3002');

INSERT INTO chain_details (product_id, metal_type, chain_style, length_inches, total_carat_weight, clasp_type)
SELECT id, '14k gold', 'cuban link', 18.0, 8.50, 'box clasp with safety latch'
FROM products WHERE slug = 'cuban-link-diamond-chain-18';

INSERT INTO chain_details (product_id, metal_type, chain_style, length_inches, total_carat_weight, clasp_type)
SELECT id, '18k gold', 'tennis', 20.0, 12.00, 'box clasp with safety latch'
FROM products WHERE slug = 'tennis-chain-classic-20';
