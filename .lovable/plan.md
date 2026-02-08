

## Complete Automation Engine - Final 10%

Three remaining gaps to reach 100% completion.

---

### 1. Add `placement_opt` Rule Type (Evaluator + UI)

The placement optimizer already exists as a playbook (`supabase/functions/playbooks/index.ts`) with full logic for adjusting Top-of-Search and Product Page bid multipliers. The rule engine and CreateRuleDialog need to support it as an automation rule type.

**Rules Engine (`supabase/functions/rules-engine-runner/index.ts`):**
- Add `evaluatePlacementOpt` method to `RuleEvaluator` class
- Params: `targetAcos`, `lookbackDays`, `minImpressions`, `minSpend`, `maxAdjustment`
- Query `campaign_placement_performance` table, aggregate by campaign + placement
- Calculate optimal bid adjustments when placement ACoS deviates from target
- Generate `set_placement_adjust` actions in auto mode
- Add `case 'placement_opt':` to the switch statement (line 801)

**CreateRuleDialog (`src/components/automation/CreateRuleDialog.tsx`):**
- Add `{ value: 'placement_opt', label: 'Placement Optimizer' }` to `RULE_TYPES`
- Add default params: `{ targetAcos: 30, lookbackDays: 14, minImpressions: 100, minSpend: 5, maxAdjustment: 300 }`
- Add default action: `{ type: 'set_placement_adjust' }`
- Add param labels for the new fields

**AutomationPage.tsx and Governance.tsx:**
- Add `'placement_opt'` to `ALL_TYPES` array so Pro/Agency users can create this rule type

---

### 2. Deploy Daypart Executor Cron Job

The `daypart-executor` edge function is fully implemented but has no cron trigger. It needs to run every hour to check schedules and pause/enable campaigns.

- Deploy the edge function
- Set up a `pg_cron` job to invoke `daypart-executor` every hour via `net.http_post`
- Uses the existing `daypart_schedules` and `daypart_execution_history` tables

---

### 3. Experiment Results Visualization

The ExperimentsTab shows basic lift and confidence numbers inline but completed experiments need a richer results view with before/after metric comparison.

**Update `src/components/automation/ExperimentsTab.tsx`:**
- For completed experiments, add an expandable detail section showing:
  - Treatment vs Baseline metrics side-by-side (spend, sales, ACoS, conversions)
  - Lift percentage with color coding (green positive, red negative)
  - Confidence level with a visual indicator (progress bar or meter)
  - Statistical significance badge (significant at 95% or not)
  - Duration of treatment period

---

### Files Summary

| File | Action |
|---|---|
| `supabase/functions/rules-engine-runner/index.ts` | Update - add `evaluatePlacementOpt` method and wire to switch |
| `src/components/automation/CreateRuleDialog.tsx` | Update - add `placement_opt` type, params, labels |
| `src/pages/AutomationPage.tsx` | Update - add `placement_opt` to `ALL_TYPES` |
| `src/pages/Governance.tsx` | Update - add `placement_opt` to `ALL_TYPES` |
| `src/components/automation/ExperimentsTab.tsx` | Update - add expandable results view for completed experiments |
| `supabase/functions/daypart-executor/index.ts` | Deploy edge function |

Additionally, a SQL statement will be run to create the hourly cron job for the daypart executor.

