-- Seed FX rates for common currency pairs
INSERT INTO fx_rates_daily (date, from_ccy, to_ccy, rate) VALUES
  -- Identity rates (same currency)
  (CURRENT_DATE, 'GBP', 'GBP', 1.0),
  (CURRENT_DATE, 'USD', 'USD', 1.0),
  (CURRENT_DATE, 'EUR', 'EUR', 1.0),
  (CURRENT_DATE, 'CAD', 'CAD', 1.0),
  (CURRENT_DATE, 'AUD', 'AUD', 1.0),
  -- GBP conversions
  (CURRENT_DATE, 'GBP', 'USD', 1.27),
  (CURRENT_DATE, 'USD', 'GBP', 0.79),
  (CURRENT_DATE, 'GBP', 'EUR', 1.17),
  (CURRENT_DATE, 'EUR', 'GBP', 0.85),
  (CURRENT_DATE, 'GBP', 'CAD', 1.72),
  (CURRENT_DATE, 'CAD', 'GBP', 0.58),
  (CURRENT_DATE, 'GBP', 'AUD', 1.93),
  (CURRENT_DATE, 'AUD', 'GBP', 0.52),
  -- USD conversions
  (CURRENT_DATE, 'USD', 'EUR', 0.92),
  (CURRENT_DATE, 'EUR', 'USD', 1.09),
  (CURRENT_DATE, 'USD', 'CAD', 1.35),
  (CURRENT_DATE, 'CAD', 'USD', 0.74),
  (CURRENT_DATE, 'USD', 'AUD', 1.52),
  (CURRENT_DATE, 'AUD', 'USD', 0.66),
  -- EUR conversions
  (CURRENT_DATE, 'EUR', 'CAD', 1.47),
  (CURRENT_DATE, 'CAD', 'EUR', 0.68),
  (CURRENT_DATE, 'EUR', 'AUD', 1.65),
  (CURRENT_DATE, 'AUD', 'EUR', 0.61)
ON CONFLICT (date, from_ccy, to_ccy) DO UPDATE SET rate = EXCLUDED.rate;

-- Backfill profile_currency for existing connections based on marketplace
INSERT INTO profile_currency (profile_id, currency)
SELECT DISTINCT 
  profile_id,
  CASE 
    WHEN marketplace_id IN ('GB', 'UK') THEN 'GBP'
    WHEN marketplace_id = 'CA' THEN 'CAD'
    WHEN marketplace_id = 'AU' THEN 'AUD'
    WHEN marketplace_id IN ('DE', 'FR', 'ES', 'IT', 'NL', 'BE') THEN 'EUR'
    ELSE 'USD'
  END as currency
FROM amazon_connections
WHERE profile_id IS NOT NULL
  AND profile_id NOT IN (SELECT profile_id FROM profile_currency)
ON CONFLICT (profile_id) DO NOTHING;