

## Profit Pulse: Weekly Digest + Monthly Report Card

Two features that solve the engagement paradox -- making PPC Pal's invisible work visible without requiring the user to do anything.

---

### Part 1: Profit Pulse Edge Function

A new `profit-pulse` edge function that runs weekly via `pg_cron`. It aggregates the last 7 days of activity per user/profile and sends a digest via Slack (now) and email (when Resend is configured later).

**Data it aggregates (all already in the database):**

| Metric | Source Table |
|---|---|
| Total actions applied | `action_queue` (status = 'applied', last 7 days) |
| Savings breakdown | Same savings logic as `useSavingsMetric` -- negative keywords, paused targets, bid reductions, ACoS improvements |
| Outcome win rate | `action_outcomes` (positive vs negative vs neutral) |
| Alerts raised | `alerts` (last 7 days) |
| Quick wins remaining | `keywords` (ACoS > 50%), `targets` (ROAS < 1) |
| Week-over-week spend/sales delta | `campaign_performance_history` (this week vs last week) |

**Slack message format:**

```text
-----------------------------------
  PPC Pal Weekly Profit Pulse
  Profile: [Brand Name]
  Week of Feb 3 - Feb 9, 2026
-----------------------------------

  Savings This Week:     +£312
  Actions Applied:       47
  Win Rate:              82% positive outcomes

  Breakdown:
  - Wasted clicks blocked:   £142
  - Bids optimised:          £98
  - Underperformers paused:  £72

  Week-over-Week:
  - Spend: £2,340 (-3.2%)
  - Sales: £8,920 (+1.8%)
  - ACoS:  26.2% (improved from 27.1%)

  1 Quick Win Available:
  12 keywords with ACoS over 50%
-----------------------------------
```

**New file:** `supabase/functions/profit-pulse/index.ts`

---

### Part 2: Monthly Report Card (In-App Page)

A new `/report-card` page accessible from the sidebar. Shows a monthly summary with the same data, formatted as a clean dashboard card layout. No user input required -- it auto-generates from existing data.

**Sections:**
1. **Hero metric** -- Total savings this month (large number, emerald accent)
2. **Decisions made** -- Count of all applied actions with outcome breakdown (positive/neutral/negative pie)
3. **Savings breakdown** -- 4 category bars (negative keywords, paused targets, bid optimisation, ACoS improvement)
4. **Month-over-month trend** -- Spend, Sales, ACoS compared to previous month
5. **Guardian status** -- "PPC Pal made 847 decisions. 82% improved performance."

**New files:**
- `src/pages/ReportCard.tsx`
- `src/hooks/useReportCard.ts` (aggregation hook, server-side query)

---

### Part 3: Notification Preferences Update

Add a "weekly" option to digest frequency in `useNotificationPrefs` and `NotificationSettings`. Users who select "weekly" will receive the Profit Pulse instead of daily digests.

**Updated files:**
- `src/hooks/useNotificationPrefs.ts` -- add 'weekly' to frequency type
- `src/components/NotificationSettings.tsx` -- add Weekly option to dropdown + explain what it includes

---

### Part 4: Cron Job + Config

Schedule the `profit-pulse` function to run every Monday at 8am UTC.

**Updated files:**
- `supabase/config.toml` -- add `[functions.profit-pulse]` with `verify_jwt = false`
- SQL migration -- `pg_cron` schedule for weekly Monday 8am

---

### Email Delivery Note

Email sending requires a Resend API key, which is not currently configured. The Profit Pulse will work immediately via **Slack webhooks** (already functional). Email delivery will be logged but not sent until you set up a Resend account and provide the API key. This can be added later without any code changes to the Profit Pulse function -- it just needs the `RESEND_API_KEY` secret.

---

### Files Summary

| File | Action |
|---|---|
| `supabase/functions/profit-pulse/index.ts` | Create -- weekly aggregation + Slack delivery |
| `src/pages/ReportCard.tsx` | Create -- monthly report card page |
| `src/hooks/useReportCard.ts` | Create -- data aggregation hook |
| `src/hooks/useNotificationPrefs.ts` | Update -- add 'weekly' frequency option |
| `src/components/NotificationSettings.tsx` | Update -- add Weekly option + description |
| `src/components/AppSidebar.tsx` | Update -- add Report Card nav link |
| `src/App.tsx` | Update -- add /report-card route |
| `supabase/config.toml` | Update -- add profit-pulse function config |
| SQL migration | Create -- pg_cron schedule for Monday 8am UTC |

