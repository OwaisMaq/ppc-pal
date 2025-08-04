-- Add missing Amazon Ads API documentation sources
INSERT INTO documentation_sources (url, title, is_active) VALUES 
('https://advertising.amazon.com/API/docs/en-us/reference/api-overview#api-endpoints', 'Amazon Ads API Endpoints', true),
('https://advertising.amazon.com/API/docs/en-us/reference/openapi-download', 'Amazon Ads OpenAPI Download', true),
('https://advertising.amazon.com/API/docs/en-us/reference/concepts/limits', 'Amazon Ads API Limits', true),
('https://advertising.amazon.com/API/docs/en-us/reference/concepts/compatibility-versioning-policy', 'Amazon Ads API Compatibility & Versioning', true),
('https://advertising.amazon.com/API/docs/en-us/reference/concepts/computed-status', 'Amazon Ads API Computed Status', true),
('https://advertising.amazon.com/API/docs/en-us/reference/concepts/developer-notes', 'Amazon Ads API Developer Notes', true),
('https://advertising.amazon.com/API/docs/en-us/reference/common-models/overview', 'Amazon Ads Common Models Overview', true),
('https://advertising.amazon.com/API/docs/en-us/reference/common-models/enums', 'Amazon Ads Common Enums', true),
('https://advertising.amazon.com/API/docs/en-us/sponsored-products/3-0/openapi/prod', 'Amazon Sponsored Products API 3.0', true),
('https://advertising.amazon.com/API/docs/en-us/sponsored-products/2-0/openapi', 'Amazon Sponsored Products API 2.0', true)
ON CONFLICT (url) DO NOTHING;