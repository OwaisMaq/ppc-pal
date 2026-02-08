

## Complete Automation Engine - Remaining Gaps

After reviewing the current codebase, there are several functional gaps that need to be addressed to bring the automation engine to full completion.

---

### Gap Summary

| Issue | Location | Impact |
|---|---|---|
| Governance "Add Rule" button is inert | `Governance.tsx` line 337 | Users can't create rules from Governance page |
| Governance rules list missing edit/delete | `Governance.tsx` line 352 | No rule management from Governance |
| Governance uses old 3-tier plan logic | `Governance.tsx` line 144 | Shows wrong plan names (no Starter/Agency) |
| `checkEntitlements` uses hardcoded logic | `rules-engine-runner` line 601 | Doesn't query `plan_entitlements` table |
| AutomationPage missing Experiments tab | `AutomationPage.tsx` | ExperimentsTab exists but isn't wired in |
| AuditLogTab missing date range filter | `AuditLogTab.tsx` | Can't filter by date as planned |
| "New Experiment" button disabled | `ExperimentsTab.tsx` line 47 | No way to create experiments |

---

### Implementation Plan

#### 1. Fix Governance Page Rule Management
Wire the "Add Rule" button to `CreateRuleDialog` and pass `onEditRule`/`onDeleteRule` to `AutomationRulesList`. Update `getPlanFeatures` to use all four tiers.

**File:** `src/pages/Governance.tsx`

#### 2. Use `plan_entitlements` Table in Rules Engine
Replace the hardcoded `checkEntitlements` function in the rules engine runner to query the `plan_entitlements` table and check both `billing_subscriptions` and `subscriptions` tables for the user's plan.

**File:** `supabase/functions/rules-engine-runner/index.ts`

#### 3. Add Experiments Tab to AutomationPage
Add a 4th tab "Experiments" to AutomationPage that renders the existing `ExperimentsTab` component.

**File:** `src/pages/AutomationPage.tsx`

#### 4. Add Date Range Filter to Audit Log
Add a date range selector (last 7d / 30d / 90d) to the AuditLogTab so users can filter historical data.

**File:** `src/components/automation/AuditLogTab.tsx`

#### 5. Enable "New Experiment" Button
Wire the disabled "New Experiment" button in ExperimentsTab to a creation dialog for setting up incrementality tests.

**File:** `src/components/automation/ExperimentsTab.tsx`

---

### Technical Details

**Governance.tsx changes:**
- Import `CreateRuleDialog` and `useEntitlements`
- Add state for `createDialogOpen` and `editingRule`
- Wire "Add Rule" button to open dialog
- Pass `onEditRule`, `onDeleteRule` to `AutomationRulesList`
- Add `createRule`, `updateRule`, `deleteRule` from `useAutomationRules`
- Update `getPlanFeatures` to handle `starter` and `agency`

**rules-engine-runner checkEntitlements:**
- Query `plan_entitlements` table for the user's plan
- Check both `billing_subscriptions` and `subscriptions` tables as fallback
- Use the `limits.rules` and `features` fields from `plan_entitlements` instead of hardcoded switch

**AutomationPage.tsx:**
- Add `TabsTrigger` for "Experiments"
- Import `ExperimentsTab`, render in new `TabsContent`
- Update grid from `grid-cols-3` to `grid-cols-4`

**AuditLogTab.tsx:**
- Add date range state (default 30 days)
- Add filter buttons (7d / 30d / 90d)
- Apply `.gte('started_at', cutoffDate)` to queries

**ExperimentsTab.tsx:**
- Create a `NewExperimentDialog` with fields for: name, entity type, entity ID, holdout percentage, duration
- Wire to the `incrementality-analyzer` edge function

---

### Files Summary

| File | Action |
|---|---|
| `src/pages/Governance.tsx` | Update - wire CreateRuleDialog, edit/delete, fix tier logic |
| `supabase/functions/rules-engine-runner/index.ts` | Update - use plan_entitlements table |
| `src/pages/AutomationPage.tsx` | Update - add Experiments tab |
| `src/components/automation/AuditLogTab.tsx` | Update - add date range filter |
| `src/components/automation/ExperimentsTab.tsx` | Update - enable New Experiment with dialog |

