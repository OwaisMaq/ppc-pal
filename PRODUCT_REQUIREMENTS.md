# PPC Pal — Product Requirements Document

> **Last Updated:** December 2024  
> **Status:** Active  
> **Version:** 2.0

---

## 1. North Star Vision

### Mission Statement

**PPC Pal is a hands-off Amazon PPC governor that automatically reduces wasted ad spend and protects performance — without requiring daily campaign management.**

PPC Pal exists to replace day-to-day PPC management with bounded, explainable automation, allowing sellers and brands to step back while retaining confidence and control.

### Core Success Criterion

> **If a user needs to log in daily to manage ads, PPC Pal has failed.**

### What PPC Pal IS

- A hands-off PPC governor
- A risk-first automation system
- A policy-level control layer
- An outcome-focused tool (savings, waste reduction, protection)

### What PPC Pal IS NOT

- ❌ Not a PPC dashboard
- ❌ Not a keyword research tool
- ❌ Not a growth-hacking engine
- ❌ Not a black-box AI optimiser
- ❌ Not a full Amazon seller suite

---

## 2. Core Value Proposition

| Principle | Description |
|-----------|-------------|
| **Hands-off by default** | PPC Pal runs in the background |
| **Risk-first automation** | All changes are bounded, reversible, and confidence-gated |
| **Governance over mechanics** | Users set policy, not bids |
| **Outcome-focused** | Measured in money saved, waste reduced, and performance protected |

---

## 3. Key Differentiators

| Area | PPC Pal Position |
|------|------------------|
| **Automation** | Conservative, bounded, explainable |
| **UX** | Calm, minimal, discourages meddling |
| **Control** | Policy-level, not granular |
| **Reporting** | Retrospective, outcome-focused |
| **Trust** | Transparency over aggression |

---

## 4. Target Users

### Primary Personas

#### 1. Amazon Sellers (SMB → Mid-Market)
- Limited time
- Risk-averse
- Wants PPC to "just work"

#### 2. Brands / Operators
- Multiple campaigns and markets
- Need predictability and governance
- Care about margin, not tinkering

#### 3. Agencies (Secondary)
- Require auditability and trust
- Prefer automation with oversight
- Need reporting, not micromanagement

### User Journey

```
Onboarding → Automation → Awareness → Governance → Review
```

| Stage | User Action |
|-------|-------------|
| **Onboarding** | Connect Amazon Ads, set guardrails and risk posture |
| **Automation** | PPC Pal runs without intervention |
| **Awareness** | Overview shows health and exceptions only |
| **Governance** | User intervenes only for high-impact decisions |
| **Review** | Periodic reports confirm outcomes |

### Pain Points Addressed

- Fear of automation breaking accounts
- PPC requiring constant attention
- Noise-heavy dashboards
- Overreaction to short-term data
- Lack of accountability in AI tools

---

## 5. Design Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Hands-off first** | UI should reduce actions, not invite them |
| **Calm over clever** | No noisy dashboards or flashing alerts |
| **Minimal but not simplistic** | Complexity hidden behind policy |
| **Trust through explanation** | Always show why, not just what |
| **No simulation data** | Only real Amazon Ads data |

### UX Requirements

- Clean, minimalistic, modern UI
- Responsive and touch-friendly
- Read-only by default where possible
- Clear separation between:
  - **Observation** — What's happening
  - **Automation** — What PPC Pal is doing
  - **Governance** — What the user controls

### Visual Design Standards

See `BRANDING_GUIDELINES.md` for detailed specifications:
- Professional color palette (HSL-based)
- Clean typography (Inter primary, Playfair Display headings)
- Subtle shadows and transitions
- No glows, complex transforms, or attention-grabbing animations

---

## 6. Core Feature Pillars

| Pillar | Description | Status |
|--------|-------------|--------|
| **Data Foundation** | Amazon OAuth, entity sync, search term sync, multi-marketplace | ✅ Built |
| **Observation Layer** | Campaign visibility, health indicators, summaries | ✅ Built |
| **Automation Engine** | Rules, policies, approvals, kill switch | ✅ Built |
| **Governance & Safety** | Guardrails, caps, rollbacks, protected entities | 🟡 Partial |
| **Reporting & Outcomes** | Retrospective performance, savings attribution | 🟡 Partial |
| **Multi-Account Control** | Rollups, FX normalization, consolidated views | ✅ Built |
| **AI Assistance** | Explainability, confidence scoring, recommendations | 🟡 Partial |

> ⚠️ **Note:** "Studios" (Search Studio, Target Studio) are no longer primary concepts. Search and Target management are subsumed into Automation and Governance, not standalone workspaces.

---

## 7. Feature Design Rules

### The Four Questions

Every feature must answer:

1. **Does this reduce or increase user involvement?**
2. **Is this policy-level or mechanical?**
3. **Is the change bounded and reversible?**
4. **Can this be explained in plain language?**

### The Golden Rule

> **If a feature increases daily meddling → do not build it.**

### User Story Pattern

❌ **Wrong:** "As a user, I want to edit bids…"

✅ **Right:** "As a user, I want to define safe boundaries so PPC Pal can manage bids without me."

---

## 8. Success Metrics

### Product Success Metrics

| Metric | Target Direction |
|--------|------------------|
| % of users with automation fully enabled | ↑ Higher is better |
| Average days between manual interventions | ↑ Higher is better |
| % of accounts requiring zero weekly action | ↑ Higher is better |
| Reduction in wasted ad spend | ↑ Higher is better |

### User Experience Metrics

| Metric | Target Direction |
|--------|------------------|
| Time-to-confidence (not time-to-first-click) | ↓ Lower is better |
| Alert-to-action ratio | ↓ Lower is better |
| Feature usage skewed toward Settings, not Campaigns | ✓ Desired pattern |

### Business Metrics

| Metric | Target Direction |
|--------|------------------|
| Retention | ↑ Higher is better (hands-off tools retain well) |
| Expansion into higher automation tiers | ↑ Higher is better |
| Support tickets per active user | ↓ Lower is better |

---

## 9. Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| Overview page load | < 2 seconds |
| Automation execution | Predictable, asynchronous |
| Core UX dependency | No real-time requirements |

### Security

| Requirement | Implementation |
|-------------|----------------|
| Data isolation | Strict Row Level Security (RLS) |
| Token storage | Encrypted OAuth tokens |
| Access control | Clear entitlement boundaries |

### Scalability

| Requirement | Implementation |
|-------------|----------------|
| Automation frequency | Gated by subscription tier |
| Multi-account | Supported without UI clutter |
| Cost control | AWS cost guardrails built-in |

---

## 10. Roadmap Philosophy

### Guiding Principle

> **Roadmap is driven by trust maturity, not feature count.**

### Completed Phases (1–8)

- ✅ Data ingestion
- ✅ Entity sync
- ✅ Metrics & analytics
- ✅ Automation foundations

### Future Phases

| Phase | Focus |
|-------|-------|
| **Phase 9** | Governance hardening |
| **Phase 10** | Outcome attribution & trust reporting |
| **Phase 11** | Advanced automation (time-aware, AI-assisted) |
| **Phase 12** | Agency & enterprise controls |

---

## 11. Technical Architecture Overview

### Frontend

| Component | Technology |
|-----------|------------|
| Framework | React (via Lovable) |
| Routing | Minimal routes, feature-flagged |
| UI Pattern | Policy-first screens |
| Styling | Tailwind CSS, shadcn/ui |

### Backend

| Component | Technology |
|-----------|------------|
| Database | Supabase (PostgreSQL + RLS) |
| API Layer | Supabase Edge Functions |
| Authentication | Supabase Auth |

### Data & Automation

| Component | Technology |
|-----------|------------|
| Data Source | Amazon Ads API (Reporting v3) |
| Ingestion | AWS Lambda + S3 |
| Automation | Guardrail-driven cadence |

---

## 12. Appendix

### A. Glossary (Outcome-Focused)

| Term | Definition |
|------|------------|
| **Guardrail** | A policy-defined boundary that prevents automation from exceeding safe limits |
| **Bounded Automation** | Changes that are capped, reversible, and explainable |
| **Confidence Score** | A metric indicating how certain the system is about a recommendation |
| **Kill Switch** | Emergency control to pause all automation instantly |
| **Waste** | Ad spend that generates no attributable conversions |

### B. Automation Decision Taxonomy

| Decision Type | Automation Level | User Involvement |
|---------------|------------------|------------------|
| Bid adjustments within guardrails | Fully automated | None |
| Negative keyword additions | Automated with logging | Review only |
| Campaign pause/enable | Approval required | Must approve |
| Budget changes | Policy-gated | Set policy only |
| New campaign creation | Not automated | Manual only |

### C. Risk & Confidence Scoring

| Confidence Level | Score Range | Automation Behavior |
|------------------|-------------|---------------------|
| High | 0.8 – 1.0 | Execute automatically |
| Medium | 0.5 – 0.79 | Execute with notification |
| Low | 0.3 – 0.49 | Require approval |
| Very Low | < 0.3 | Suggest only, no action |

### D. Feature Audit Checklist

Before building any feature, verify:

- [ ] Does it reduce user involvement?
- [ ] Is it policy-level, not mechanical?
- [ ] Are changes bounded and reversible?
- [ ] Can it be explained in plain language?
- [ ] Does it align with "hands-off" philosophy?
- [ ] Does it use real data only (no simulation)?

---

## Final North Star (Internal, Unambiguous)

> **PPC Pal exists to make Amazon PPC something users don't have to think about every day.**

If a feature:
- Encourages frequent tweaking
- Requires constant attention
- Optimises curiosity over outcomes

…**it is out of scope**, regardless of how "powerful" it sounds.
