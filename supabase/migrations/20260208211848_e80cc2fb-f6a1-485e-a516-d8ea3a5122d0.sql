
-- Clear existing plan_entitlements and re-seed with four tiers
DELETE FROM plan_entitlements;

INSERT INTO plan_entitlements (plan, features, limits) VALUES
('free',
  '{"alerts": false, "playbooks": false, "budget_copilot": false,
    "anomaly_detection": false, "multi_account": false,
    "api_access": false, "white_label": false}'::jsonb,
  '{"profiles": 1, "campaigns": 1, "rules": 0,
    "history_days": 7}'::jsonb
),
('starter',
  '{"alerts": true, "alerts_email_only": true,
    "playbooks": false, "budget_copilot": false,
    "anomaly_detection": false, "multi_account": false,
    "api_access": false, "white_label": false}'::jsonb,
  '{"profiles": 3, "campaigns": 100, "rules": 5,
    "history_days": 30}'::jsonb
),
('pro',
  '{"alerts": true, "playbooks": true, "budget_copilot": true,
    "anomaly_detection": true, "multi_account": "view_only",
    "api_access": false, "white_label": false}'::jsonb,
  '{"profiles": 10, "campaigns": 1000, "rules": -1,
    "history_days": 90}'::jsonb
),
('agency',
  '{"alerts": true, "alerts_webhook": true, "playbooks": true,
    "custom_playbooks": true, "budget_copilot": true,
    "anomaly_detection": true, "multi_account": true,
    "rollups": true, "white_label": true, "api_access": true}'::jsonb,
  '{"profiles": -1, "campaigns": -1, "rules": -1,
    "history_days": 365}'::jsonb
);
