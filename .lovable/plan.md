

## Operational Cost Reduction — ✅ COMPLETED

All 6 items implemented.

| # | Item | Status | Details |
|---|---|---|---|
| 1 | Token refresh frequency | ✅ Done | Rescheduled from every 30s → every 20 min (`*/20 * * * *`). 97.5% reduction. |
| 2 | Login sync cooldown | ✅ Done | `useLoginSync.ts` cooldown increased from 30 min → 4 hours. |
| 3 | Entitlement checks client-side | ✅ Done | Confirmed no frontend code calls `check-entitlement` edge function — already optimized. |
| 4 | AI insights data hash caching | ✅ Done | `ai-insights/index.ts` now computes a metric hash and skips LLM if cached insights exist within 12 hours. Scheduler reduced from 6h → 12h. |
| 5 | Hourly cron consolidation | ✅ Done | Created `hourly-orchestrator` edge function. Replaced 3 individual cron jobs (`ams-hourly-aggregation`, `invoke-daypart-executor-hourly`, `rules-engine-runner-1h`) with single `hourly-orchestrator` job. |
| 6 | Subscription check guard | ✅ Done | `useSubscription.ts` now checks `subscriptions.updated_at` and skips Stripe API call if data is less than 1 hour old. |

### Estimated Daily Savings

| Area | Before | After | Reduction |
|---|---|---|---|
| Token refresh invocations | ~2,880 | 72 | 97.5% |
| Hourly cron cold starts | 72 (3×24) | 24 | 67% |
| AI insights LLM calls | ~4/user | ~1-2/user | 50-75% |
| Stripe API calls | Every page load | 1/hour max | ~90% |
| Login sync invocations | Every 30 min | Every 4 hours | 87.5% |

### Files Changed

- `src/hooks/useLoginSync.ts` — cooldown 30min → 4hrs
- `src/hooks/useSubscription.ts` — cached Stripe check
- `supabase/functions/ai-insights/index.ts` — data hash caching
- `supabase/functions/hourly-orchestrator/index.ts` — NEW, consolidates 3 hourly jobs
- `supabase/config.toml` — added hourly-orchestrator config
- SQL migration — rescheduled token refresh, replaced 3 hourly crons, reduced AI scheduler to 12h
