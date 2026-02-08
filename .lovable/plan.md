

## Operational Cost Reduction

Targeted changes to reduce edge function invocations, AI gateway calls, and redundant database queries.

---

### 1. Fix Token Refresh Frequency (biggest single saving)

The `amazon-token-refresh` cron job runs every **30 seconds** (2,880/day). Amazon tokens last 1 hour and `refresh-all-tokens` already filters to tokens expiring within 45 minutes. Change to every **20 minutes** (72/day) -- a 97.5% reduction.

**Action:** Run SQL to unschedule and reschedule the cron job at `*/20 * * * *`.

---

### 2. Increase Login Sync Cooldown

`useLoginSync.ts` currently triggers entity + performance sync if last sync was >30 minutes ago. Increase to **4 hours** since background cron jobs already handle syncing every 2 hours.

**File:** `src/hooks/useLoginSync.ts`
- Change `thirtyMinutes = 30 * 60 * 1000` to `fourHours = 4 * 60 * 60 * 1000`

---

### 3. Move Entitlement Checks Client-Side

The `check-entitlement` edge function does two simple DB queries (`billing_subscriptions` + `plan_entitlements`). The frontend `useEntitlements` hook already does the same thing directly. Remove the edge function invocation overhead by having entitlement checks happen exclusively through the existing `useEntitlements` hook (which queries Supabase directly).

**File:** `src/hooks/useEntitlements.ts`
- Add a `checkEntitlementServer` method that calls the edge function only when needed from backend contexts (rules engine already does its own check)
- No frontend code currently calls `check-entitlement` edge function directly, so this is already optimized -- confirm and document

---

### 4. Cache AI Insights with Data Hash

Avoid regenerating identical LLM insights when campaign data hasn't changed significantly.

**File:** `supabase/functions/ai-insights/index.ts`
- Before calling the LLM, compute a simple hash of the key metrics (total spend, sales, ACoS, top 5 campaign spends)
- Check `ai_insights` table for a recent entry (last 12 hours) with matching `data_hash`
- If match found, return cached insights instead of making an LLM call
- Store `data_hash` alongside new insights

**File:** `supabase/functions/ai-insights-scheduler/index.ts`
- Reduce frequency recommendation from every 6 hours to every 12 hours (via cron update SQL)

---

### 5. Consolidate Hourly Cron Jobs

Three functions run at the top of every hour: `ams-hourly-aggregation`, `daypart-executor`, and `rules-engine-runner` (at :30). Create a single orchestrator that runs all three sequentially, reducing cold-start overhead.

**New file:** `supabase/functions/hourly-orchestrator/index.ts`
- Sequentially invoke `ams-aggregate`, `daypart-executor`, and `rules-engine-runner`
- Early-exit each step if no active users/connections exist
- Single cron job replaces 3 separate jobs

**Action:** SQL migration to unschedule the 3 individual hourly jobs and schedule the orchestrator once per hour.

---

### 6. Guard Subscription Check

`useSubscription.ts` calls `check-subscription` edge function (which hits Stripe API) on every mount. Add caching: skip the Stripe call if `subscriptions` table was updated within the last hour.

**File:** `src/hooks/useSubscription.ts`
- Before calling `check-subscription`, check if `subscriptions.updated_at` is within the last hour
- If recent, use the cached DB value and skip the edge function call

---

### Files Summary

| File | Action |
|---|---|
| `src/hooks/useLoginSync.ts` | Update - increase cooldown from 30 min to 4 hours |
| `src/hooks/useSubscription.ts` | Update - cache Stripe check, skip if updated < 1 hour ago |
| `supabase/functions/ai-insights/index.ts` | Update - add data hash caching to skip redundant LLM calls |
| `supabase/functions/hourly-orchestrator/index.ts` | Create - consolidate 3 hourly cron jobs into one |
| `supabase/config.toml` | Update - add hourly-orchestrator function config |
| SQL (run directly) | Reschedule token refresh to every 20 min; replace 3 hourly crons with 1 orchestrator; reduce AI insights scheduler to every 12 hours |

### Estimated Savings

| Area | Before (daily) | After (daily) | Reduction |
|---|---|---|---|
| Token refresh invocations | ~2,880 | 72 | 97.5% |
| Hourly cron cold starts | 72 (3 x 24) | 24 | 67% |
| AI insights LLM calls | ~4 per user | ~1-2 per user | 50-75% |
| Stripe API calls | Every page load | 1 per hour max | ~90% |
| Login sync invocations | Every 30 min | Every 4 hours | 87.5% |

