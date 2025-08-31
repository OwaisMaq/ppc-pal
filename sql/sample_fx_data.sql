-- Sample FX rates for testing
INSERT INTO fx_rates_daily (date, from_ccy, to_ccy, rate) VALUES
-- USD to GBP (approximate rates)
(CURRENT_DATE, 'USD', 'GBP', 0.79),
(CURRENT_DATE - INTERVAL '1 day', 'USD', 'GBP', 0.785),
(CURRENT_DATE - INTERVAL '7 days', 'USD', 'GBP', 0.788),
(CURRENT_DATE - INTERVAL '14 days', 'USD', 'GBP', 0.792),

-- EUR to GBP
(CURRENT_DATE, 'EUR', 'GBP', 0.85),
(CURRENT_DATE - INTERVAL '1 day', 'EUR', 'GBP', 0.848),
(CURRENT_DATE - INTERVAL '7 days', 'EUR', 'GBP', 0.852),
(CURRENT_DATE - INTERVAL '14 days', 'EUR', 'GBP', 0.855),

-- GBP to USD
(CURRENT_DATE, 'GBP', 'USD', 1.27),
(CURRENT_DATE - INTERVAL '1 day', 'GBP', 'USD', 1.274),
(CURRENT_DATE - INTERVAL '7 days', 'GBP', 'USD', 1.269),
(CURRENT_DATE - INTERVAL '14 days', 'GBP', 'USD', 1.263),

-- EUR to USD
(CURRENT_DATE, 'EUR', 'USD', 1.08),
(CURRENT_DATE - INTERVAL '1 day', 'EUR', 'USD', 1.082),
(CURRENT_DATE - INTERVAL '7 days', 'EUR', 'USD', 1.078),
(CURRENT_DATE - INTERVAL '14 days', 'EUR', 'USD', 1.075),

-- USD to EUR
(CURRENT_DATE, 'USD', 'EUR', 0.926),
(CURRENT_DATE - INTERVAL '1 day', 'USD', 'EUR', 0.924),
(CURRENT_DATE - INTERVAL '7 days', 'USD', 'EUR', 0.928),
(CURRENT_DATE - INTERVAL '14 days', 'USD', 'EUR', 0.930),

-- GBP to EUR
(CURRENT_DATE, 'GBP', 'EUR', 1.176),
(CURRENT_DATE - INTERVAL '1 day', 'GBP', 'EUR', 1.179),
(CURRENT_DATE - INTERVAL '7 days', 'GBP', 'EUR', 1.173),
(CURRENT_DATE - INTERVAL '14 days', 'GBP', 'EUR', 1.169)

ON CONFLICT (date, from_ccy, to_ccy) DO UPDATE SET
rate = EXCLUDED.rate;

-- Sample profile currency mappings
-- This would typically be populated when profiles are first connected
-- For now, we'll add some sample data for testing

-- Note: These would need to match actual profile_ids from your amazon_connections table
-- You can update these manually or via an admin interface later