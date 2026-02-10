

## Beta Readiness: Make the First 10 Users Successful

An audit of the codebase reveals six areas needing work. Some have good foundations, others are empty shells. Here is what exists, what is missing, and exactly what to build.

---

### 1. Onboarding Experience (High Priority)

**What exists:** A 5-step wizard (welcome, OAuth connect, goal selector, feature overview, completion). Sync progress polling on step 4. OnboardingCheck redirects new users.

**Problems:**
- Step 4 ("Key Features Overview") is filler — a static list of features the user has not experienced yet. It adds no value.
- The sync progress indicator only appears on step 5 (completion), not where the user waits.
- After onboarding, the user lands on Command Center which may show "No campaigns found" if sync has not completed.
- No estimated time shown for initial sync.
- No "first value" moment — user finishes onboarding with nothing to look at.

**What to build:**
- Remove step 4 (feature overview) — consolidate to a 4-step wizard: Welcome, Connect, Goal, Ready.
- Move sync progress to the final step and make it the focus: show a live progress bar with estimated time ("Usually takes 5-15 minutes for the first sync").
- Add a "first insight teaser" on completion: once any data arrives, surface one real metric immediately ("We found 47 campaigns spending GBP 2,340 last week"). Query `campaigns` count and `campaign_performance_history` sum as soon as data lands.
- Add a post-sync redirect: if sync is still running when user clicks "Go to Dashboard", show a persistent banner on the Command Center page: "Your data is still syncing. We will notify you when your first insights are ready."
- Track `onboarding_step_viewed`, `onboarding_completed`, and `onboarding_skipped` events.

**Files:**
- `src/components/OnboardingWizard.tsx` — restructure steps, add first-insight query
- `src/pages/CommandCenter.tsx` — add persistent sync-in-progress banner for new users
- `src/components/SyncProgressIndicator.tsx` — reuse in onboarding context

---

### 2. Profit Pulse Email (Already Built — Needs Polish)

**What exists:** `supabase/functions/profit-pulse/index.ts` sends weekly Slack digests. `pg_cron` scheduled for Monday 8am UTC. Report Card page at `/report-card`.

**What is missing:**
- Email delivery (Resend stub exists but no key configured)
- No fallback for users without Slack webhooks — the vast majority of beta users will not have configured one
- No onboarding prompt to set up notification preferences

**What to build:**
- Add a step in the onboarding wizard (or a post-onboarding prompt) asking users to provide an email or Slack webhook for weekly updates.
- Implement Resend email delivery in the `profit-pulse` function (requires `RESEND_API_KEY` secret).
- Default all new users to `digest_frequency = 'weekly'` in `user_prefs` so they receive the Profit Pulse automatically.
- Send a "Welcome" Profit Pulse within 48 hours of first data sync completing, not waiting until the next Monday.

**Files:**
- `supabase/functions/profit-pulse/index.ts` — add Resend email sending, add welcome pulse trigger
- `src/components/OnboardingWizard.tsx` — add notification preference step or post-onboarding prompt
- SQL migration — default `digest_frequency` to `'weekly'` for new `user_prefs` rows

---

### 3. Feedback Capture (Partially Built — Needs Floating Button + NPS)

**What exists:** Full feedback form at `/feedback` page. `ReportIssueButton` component with issue type picker deployed on major feature components. `feature_issue_reports` table.

**What is missing:**
- No floating/persistent feedback button — users must navigate to `/feedback` or find the small flag icon
- No NPS or satisfaction prompt triggered by time/usage milestones
- No way to capture "I am confused" signals from new users

**What to build:**
- Add a floating feedback button (bottom-right corner, above cookie banner) visible on all authenticated pages. A small "?" or chat bubble icon that opens a compact version of the FeedbackForm in a sheet/drawer.
- Add a one-time NPS prompt after 7 days of account creation: "How likely are you to recommend PPC Pal?" (1-10 scale). Store result in `feedback` table with `feedback_type = 'nps'`. Show only once per user (track via localStorage or `profiles` column).
- Track `feedback_submitted` and `nps_score` events via analytics.

**Files:**
- `src/components/FloatingFeedbackButton.tsx` — new component, renders on all dashboard pages
- `src/components/NPSPrompt.tsx` — new component, triggered after 7 days
- `src/components/DashboardShell.tsx` — add FloatingFeedbackButton and NPSPrompt
- SQL migration — add `nps_prompted_at` column to `profiles` (nullable timestamp)

---

### 4. Error Handling and Edge Cases (Medium Priority)

**What exists:** Global `ErrorBoundary` with refresh button. Empty states in Campaigns, DashboardKPIs, ConsolidatedDataView. Token expiry detection in Command Center. `SyncProgressIndicator` for active syncs.

**What is missing:**
- No graceful handling for "0 campaigns" new account state — Command Center shows health cards with zero values, which looks broken
- No handling for marketplace mismatch (user connects EU account but data returns in unexpected format)
- Token refresh failure does not surface clearly to users
- No retry mechanism for failed edge function calls in hooks

**What to build:**
- Add a "Welcome State" to Command Center: when `connections.length > 0` but `campaigns` count is 0, show a dedicated card: "Your account is connected! Data sync is in progress. Your first insights will appear here shortly." with the SyncProgressIndicator embedded.
- Add a global toast notification when `TokenRefreshMonitor` detects an expired token, prompting reconnection.
- Add `retry` logic to critical hooks (`useAggregatedMetrics`, `useActionQueue`) — the QueryClient already has retry:3 configured, but individual edge function calls via `supabase.functions.invoke` do not retry.
- Add error logging to a `client_errors` table for unhandled errors caught by ErrorBoundary (currently only logs to console).

**Files:**
- `src/pages/CommandCenter.tsx` — add welcome/empty state for new connections with no data yet
- `src/components/TokenRefreshMonitor.tsx` — add user-facing toast on token expiry
- `src/components/ErrorBoundary.tsx` — add Supabase error logging
- SQL migration — create `client_errors` table (user_id, error_message, component_stack, page_url, created_at)

---

### 5. Documentation and Help Content (Medium Priority)

**What exists:** Tooltips on guardrails settings. Beta Guide page at `/beta-guide` with setup tracker. AmazonOAuthSetup component with setup instructions.

**What is missing:**
- No FAQ page
- No getting-started guide beyond the beta guide
- No contextual help tooltips on KPI cards, metrics, or automation concepts (ACoS, ROAS, etc.)
- No help link in the sidebar
- The Beta Guide links to `docs.lovable.dev` which is unrelated to PPC Pal

**What to build:**
- Create a `/help` page with: Getting Started steps (mirrors beta guide), FAQ section (expandable accordion), Glossary of PPC terms (ACoS, ROAS, TACoS, etc.), and Contact/Support section.
- Add contextual tooltips to KPI metrics in Command Center and Dashboard: hover over "ACoS" to see "Advertising Cost of Sales — your ad spend divided by ad revenue. Lower is better."
- Add a "Help" link in the sidebar navigation.
- Fix the Beta Guide help link to point to `/help` instead of `docs.lovable.dev`.

**Files:**
- `src/pages/Help.tsx` — new page with FAQ accordion and glossary
- `src/components/AppSidebar.tsx` — add Help nav link
- `src/App.tsx` — add `/help` route
- `src/components/overview/AccountHealthCard.tsx` — add metric tooltips
- `src/pages/BetaGuide.tsx` — fix help link

---

### 6. Analytics and Logging (High Priority)

**What exists:** PostHog SDK installed and integrated. `track()` and `initAnalytics()` functions exist. Cookie consent system works. But `POSTHOG_KEY` is an empty string — zero events are being captured. The only `track()` calls are on the waitlist signup form.

**What is missing:**
- PostHog API key not configured — analytics is completely non-functional
- No page view tracking beyond PostHog's built-in (which is also off)
- No feature usage tracking (which pages users visit, which rules they enable, which buttons they click)
- No funnel tracking (onboarding completion rate, OAuth success rate)
- No session recording

**What to build:**
- Configure `POSTHOG_KEY` — this requires you to create a PostHog project and add the key to `src/lib/analytics.ts`. This is the single highest-impact change: one line unlocks all page view and session data.
- Add `track()` calls to critical user actions:
  - `onboarding_step_viewed` (step number)
  - `onboarding_completed` / `onboarding_skipped`
  - `amazon_connect_initiated` / `amazon_connect_success` / `amazon_connect_error`
  - `rule_enabled` / `rule_disabled` (rule_type)
  - `action_approved` / `action_rejected`
  - `feedback_submitted` (type)
  - `page_viewed` (route) — add to a route change listener
  - `sync_triggered` (manual vs auto)
- Add a route-change tracker in `App.tsx` that fires `page_viewed` on every navigation.
- Enable PostHog session recording for beta users (add `session_recording: { maskAllInputs: true }` to PostHog config).

**Files:**
- `src/lib/analytics.ts` — add PostHog key, enable session recording
- `src/App.tsx` — add route change listener for page_viewed events
- `src/components/OnboardingWizard.tsx` — add step tracking events
- `src/components/AmazonAccountSetup.tsx` — add connect/sync tracking events
- `src/components/governance/GuardrailsSettings.tsx` — add rule change tracking
- `src/components/FeedbackForm.tsx` — add feedback_submitted tracking

---

### Implementation Order

| Priority | Area | Effort | Impact |
|---|---|---|---|
| 1 | Analytics — configure PostHog key + add track() calls | Small | Unlocks all user behaviour data before beta users arrive |
| 2 | Onboarding — restructure wizard, add first-insight moment | Medium | Determines whether users activate or abandon |
| 3 | Floating feedback button + NPS prompt | Small | Captures signal from day one |
| 4 | Command Center welcome state for new users | Small | Prevents "broken empty screen" impression |
| 5 | Help page with FAQ and glossary | Medium | Reduces support burden, prevents silent churn |
| 6 | Profit Pulse email delivery + welcome pulse | Medium | Anti-churn mechanism from week one |
| 7 | Error logging to database | Small | Visibility into what breaks for real users |

---

### Technical Summary

| File | Action |
|---|---|
| `src/lib/analytics.ts` | Update — add PostHog key, session recording config |
| `src/App.tsx` | Update — add route change tracker, `/help` route |
| `src/components/OnboardingWizard.tsx` | Update — restructure to 4 steps, add sync focus, first insight, tracking |
| `src/pages/CommandCenter.tsx` | Update — add welcome state for zero-data users |
| `src/components/FloatingFeedbackButton.tsx` | Create — persistent feedback trigger |
| `src/components/NPSPrompt.tsx` | Create — 7-day NPS survey |
| `src/components/DashboardShell.tsx` | Update — mount floating feedback + NPS |
| `src/pages/Help.tsx` | Create — FAQ, glossary, getting started |
| `src/components/AppSidebar.tsx` | Update — add Help link |
| `src/components/ErrorBoundary.tsx` | Update — log errors to Supabase |
| `src/components/FeedbackForm.tsx` | Update — add analytics tracking |
| `src/components/AmazonAccountSetup.tsx` | Update — add connect/sync tracking |
| `supabase/functions/profit-pulse/index.ts` | Update — add Resend email, welcome pulse |
| `src/pages/BetaGuide.tsx` | Update — fix help link |
| SQL migration | Create — `client_errors` table, `nps_prompted_at` column on profiles, default digest_frequency |

This is a lot to build. I would recommend tackling it in 3-4 separate implementation rounds, starting with analytics (priority 1) and onboarding (priority 2) together, then feedback + empty states, then help page + email delivery.
