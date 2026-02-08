

## Updated Subscription Tiers

Based on your feedback, here are the revised tiers with three key changes:

1. **Sync limits removed** -- all tiers get unlimited syncs
2. **Data granularity unlocked** -- all tiers see campaign, ad group, target, and search term data
3. **AI Insights available to all** -- no longer gated by tier
4. **Free tier limited to 1 campaign** (down from 10)

---

### Revised Tier Comparison

| Feature | Free ($0) | Starter ($29/mo) | Pro ($79/mo) | Agency ($199/mo) |
|---|---|---|---|---|
| **Profiles** | 1 | 3 | 10 | Unlimited |
| **Campaigns** | 1 | 100 | 1,000 | Unlimited |
| **Data History** | 7 days | 30 days | 90 days | 365 days |
| **Sync Frequency** | Real-time | Real-time | Real-time | Real-time |
| **Monthly Syncs** | Unlimited | Unlimited | Unlimited | Unlimited |
| **Data Granularity** | All levels | All levels | All levels | All levels |
| **AI Insights** | Yes | Yes | Yes | Yes |
| **Automation Rules** | 0 | 5 | Unlimited | Unlimited |
| **Alerts** | No | Email only | Email + in-app | Email + in-app + webhook |
| **Playbooks** | No | No | Yes | Yes + custom |
| **Budget Copilot** | No | No | Yes | Yes |
| **Anomaly Detection** | No | No | Yes | Yes |
| **Multi-Account** | No | No | View only | Full management |
| **White Label** | No | No | No | Yes |
| **API Access** | No | No | No | Yes |

---

### What Changes vs. the Previous Plan

**Removed gates:**
- `monthly_syncs` limit removed from all tiers (was 10 / 100 / 5,000 / unlimited)
- `ams_realtime` feature flag removed (all tiers get real-time)
- `data_adgroup`, `data_target`, `data_search_term` flags removed (all tiers get all data levels)
- `ai_insights` feature flag removed (all tiers get AI insights)

**Tightened:**
- Free tier campaigns: 10 down to 1

---

### Technical Implementation

**1. Database migration -- update `plan_entitlements`**

```sql
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
```

**2. Update `check-entitlement` edge function**
- Remove checks for `monthly_syncs`, `ams_realtime`, `data_adgroup`, `data_target`, `data_search_term`, `ai_insights`
- Keep checks for: `profiles`, `campaigns`, `rules`, `history_days`, `alerts`, `playbooks`, `budget_copilot`, `anomaly_detection`, `multi_account`, `api_access`, `white_label`
- Treat `-1` as unlimited in limit checks

**3. Update `useSubscription` hook**
- Remove sync-related usage tracking
- Remove data-level gating logic

**4. Update Stripe products**
- Create Starter ($29/mo, $278/yr), Pro ($79/mo, $758/yr), Agency ($199/mo, $1,910/yr)
- Map Stripe price IDs to plan names in `create-checkout` and `stripe-webhook`

**5. Create `useEntitlements` hook**
- `checkFeature(feature)` and `checkLimit(limit, currentValue)` for client-side gating
- Returns upgrade prompt info when a feature is blocked

**6. UI updates**
- Update `BillingSettings` to show the four tiers
- Create `UpgradePrompt` component for gated features
- Update landing page pricing section
- Add tier badge in sidebar/header

**7. Enforce campaign limit for Free tier**
- Add check in campaign creation flow: if free tier and campaigns >= 1, show upgrade prompt

### Files to create/modify

| File | Action |
|---|---|
| `supabase/migrations/xxx_tier_entitlements.sql` | Create -- schema + seed data |
| `supabase/functions/check-entitlement/index.ts` | Update -- simplified checks |
| `supabase/functions/create-checkout/index.ts` | Update -- four tier price mapping |
| `supabase/functions/stripe-webhook/index.ts` | Update -- plan mapping |
| `src/hooks/useEntitlements.ts` | Create -- client-side entitlement hook |
| `src/hooks/useSubscription.ts` | Update -- remove sync/data gating |
| `src/components/UpgradePrompt.tsx` | Create -- reusable upgrade modal |
| `src/components/TierBadge.tsx` | Create -- plan indicator |
| `src/components/settings/BillingSettings.tsx` | Update -- four-tier display |
| `src/pages/PublicLanding.tsx` | Update -- pricing section |

