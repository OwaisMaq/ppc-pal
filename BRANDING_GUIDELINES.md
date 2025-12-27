# PPC Pal - Branding Guidelines

## Brand Philosophy: "The Watchful Guardian"

PPC Pal embodies **Intentional Clarity** over mere minimalism. Our interface communicates safety, bounded automation, and explainable decisions. Every element reinforces the promise: your campaigns are protected by a vigilant governor that operates within your defined limits.

### Core Principles

#### 1. The Guardrail Effect
Design elements emphasize safety and boundaries. Use "framed" layouts and containerized data to visually represent that automation is "bounded" and under control.

#### 2. Explainable Automation
Never show an automated change without a reasoning tooltip or log. The UI must answer **"Why did the Pal do this?"** at a glance.

#### 3. Hands-Off Confidence
Prioritize high-level outcomes over granular tweaks. The largest numbers should be "Wasted Spend Saved" and "Time Reclaimed"—metrics that validate the user's decision to step back.

---

## Color Palette: "Trust & Growth"

Our colors reflect the dual nature of protection (reducing wasted spend) and growth (protecting performance).

### Primary Colors

```css
/* The Governor - Authority & Control */
--primary: 222.2 47.4% 11.2%;           /* Deep Navy */
--primary-foreground: 210 40% 98%;      /* Clean white text */

/* The Growth - Profit & Success */
--accent-emerald: 158 64% 52%;          /* Emerald green */

/* The Pal - Calm & Hands-off */
--muted: 210 40% 96.1%;                 /* Soft Slate */
--muted-foreground: 215.4 16.3% 46.9%;  /* Cool grey text */
```

### Semantic Status Colors

```css
/* Standard Status */
--success: 158 64% 52%;                 /* Emerald - Positive outcomes */
--warning: 38 92% 50%;                  /* Amber - Standard warnings */
--error: 0 84% 60%;                     /* Red - Errors */
--info: 199 89% 48%;                    /* Sky blue - Information */

/* Special: Manual Intervention Required */
--intervention-amber: 45 93% 47%;       /* Distinct from standard warning */
```

### Neutral Palette

```css
--background: 0 0% 100%;                /* Pure white */
--foreground: 222.2 84% 4.9%;           /* Deep text */
--card: 0 0% 100%;                      /* White cards */
--border: 214.3 31.8% 91.4%;            /* Cool grey borders */
```

### Shadow System

```css
--shadow-sm: 0 1px 2px 0 hsl(var(--foreground) / 0.05);
--shadow-md: 0 4px 6px -1px hsl(var(--foreground) / 0.1), 0 2px 4px -1px hsl(var(--foreground) / 0.06);
--shadow-lg: 0 10px 15px -3px hsl(var(--foreground) / 0.1), 0 4px 6px -2px hsl(var(--foreground) / 0.05);
```

---

## Typography: "The Modern Analyst"

A tech-forward, precise typographic system that feels professional yet approachable.

### Font Stack

```css
/* Display - Headlines & Titles */
--font-display: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;

/* Body - Content & Data */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Typography Scale

| Use Case | Size | Weight | Font |
|----------|------|--------|------|
| Hero Headlines | 5xl-8xl | Bold (700) | Plus Jakarta Sans |
| Section Headings | 2xl-4xl | Semi-bold (600) | Plus Jakarta Sans |
| Body Text | base-lg | Regular (400) | Inter |
| Data/Tables | sm-base | Regular (400) | Inter |
| Labels/Captions | sm | Medium (500) | Inter |

### Usage Guidelines

- Use Plus Jakarta Sans for all headings (h1-h6)
- Use Inter for body text, data tables, and UI elements
- Maintain proper line height ratios (1.2-1.6)
- Ensure sufficient color contrast (WCAG AA minimum)

---

## Component Guidelines

### The "Bounded System" Visual Metaphor

#### The Frame
Use subtle 1px borders for all data modules. This creates a sense of "order" and "containment."

```tsx
<Card className="border border-border bg-card">
  {/* Content is visually contained */}
</Card>
```

#### The Guardrail
Whenever an automated action is displayed, visually "anchor" it to the rule that triggered it.

---

### The "Logic Chip"

A small, pill-shaped badge next to every automated action that shows the triggering logic.

```tsx
// Design: Pill-shaped badge with muted background
<Badge variant="secondary" className="text-xs font-mono">
  [ACOS > 40%] → [Bid -10%]
</Badge>
```

**Rules:**
- Must appear next to every automated change
- Contains simple If/Then statement
- Uses muted background from palette
- On hover, expands to show full reasoning

---

### The "Reasoning Row"

Expands action details to show the complete logic path.

```tsx
<div className="text-sm text-muted-foreground">
  <span className="font-medium">Why:</span> Campaign exceeded 40% ACOS 
  for 3 consecutive days. Bid reduced by 10% to protect margin.
</div>
```

**Rules:**
- Always available on hover or click
- Links action to specific metric thresholds
- Uses calm, explanatory language

---

### Activity Feed

A vertical timeline of "Pal Actions" for quick scanning.

**Design Rules:**
- High-contrast status dots for instant recognition
- Each action linked to triggering rule
- Group by time period (Today, Yesterday, This Week)
- Use status colors: Emerald (protected), Amber (warning), Navy (info)

```tsx
<div className="flex items-start gap-3">
  <div className="w-2 h-2 rounded-full bg-accent-emerald mt-2" />
  <div>
    <p className="text-sm font-medium">Protected margin on Campaign #102</p>
    <p className="text-xs text-muted-foreground">
      Lowered bid to $0.80 after 5 non-converting clicks
    </p>
  </div>
</div>
```

---

### Confidence Meters

Visual indicators for "Automation Health" and "Budget Safety."

```tsx
// Simple progress bar showing automation confidence
<div className="space-y-1">
  <div className="flex justify-between text-sm">
    <span>Automation Confidence</span>
    <span className="font-medium">87%</span>
  </div>
  <Progress value={87} className="h-2" />
</div>
```

---

### Buttons

```tsx
// Primary - Authoritative actions
<Button variant="default">Apply Changes</Button>

// Secondary - Supporting actions
<Button variant="secondary">View Details</Button>

// Outline - Tertiary actions
<Button variant="outline">Configure</Button>

// Ghost - Minimal actions
<Button variant="ghost">Dismiss</Button>
```

**Design Rules:**
- No gradient backgrounds
- Subtle hover effects (opacity or background shift)
- Consistent padding and heights
- Rounded-md border radius

---

### Cards

```tsx
<Card className="border bg-card shadow-sm">
  <CardHeader>
    <CardTitle className="font-display">Clean Title</CardTitle>
    <CardDescription>Professional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content with clear hierarchy */}
  </CardContent>
</Card>
```

**Design Rules:**
- 1px border for containment effect
- Clean white/card backgrounds
- Subtle shadows (shadow-sm to shadow-md)
- Consistent border radius

---

### "Safe Zone" Visualizations

For charts, use shaded bands to represent target ranges.

**Design:**
- Horizontal shaded band represents "Target ACOS" or "Target Spend"
- When data stays in band = Governor is silent
- When data hits edge = Governor acts (show action marker)

---

## Brand Voice: "The Calm Expert"

The voice eliminates anxiety about "What is the bot doing?" It is reassuring, transparent, and steady.

### Voice Examples

| Scenario | Traditional SaaS | PPC Pal (The Governor) |
|----------|-----------------|------------------------|
| Bid Change | "Bid decreased to $0.80." | "PPC Pal lowered the bid on Campaign #102 to protect your margin after 5 non-converting clicks." |
| Daily Summary | "Your campaigns are running." | "PPC Pal performed 14 actions today to prevent $120 in wasted spend." |
| Error | "API Connection Lost." | "We've lost the connection to Amazon. PPC Pal has paused automation to ensure no incorrect changes are made." |
| Success | "Campaign optimized." | "Protected $450 in potential wasted spend this week while maintaining your ROAS target." |

### Key Traits

- **Proactive:** Uses action verbs (Protected, Saved, Optimized, Filtered)
- **Transparent:** Always links an action to a result
- **Steady:** Avoids alarmist language; warnings feel like routine check-ins
- **Outcome-focused:** Emphasizes what was achieved, not just what happened

---

## Visual Hierarchy: "Hands-Off" Principle

### Priority Metrics (Largest Display)
1. **Wasted Spend Saved** - Primary validation metric
2. **Time Reclaimed** - Quantifies hands-off benefit
3. **Protection Events** - Actions taken by the Governor

### Secondary Metrics (Standard Display)
- ROAS / ACOS
- Total Spend
- Conversions

### Tertiary Metrics (Available on Drill-down)
- Clicks
- Impressions
- CTR

---

## Animation Guidelines

### Approved Animations

```css
/* Subtle, functional animations only */
transition-colors duration-200    /* Color transitions */
hover:shadow-md                   /* Shadow changes */
animate-fade-in                   /* Content appearance */
```

### Interaction Patterns

- **Action Indicators:** Brief pulse when automation takes action
- **Logic Reveal:** Smooth expand for reasoning tooltips
- **Status Updates:** Fade transitions for metric changes

### Forbidden Effects

- ❌ Pulse glows and electric effects
- ❌ Floating decorative shapes
- ❌ Gradient animations
- ❌ Complex 3D transforms
- ❌ Bouncy or playful animations

---

## Dark Mode

### Dark Mode Palette

```css
--background: 222.2 84% 4.9%;     /* Deep background */
--foreground: 210 40% 98%;        /* Light text */
--card: 222.2 47% 11%;            /* Dark cards */
--border: 217.2 32.6% 17.5%;      /* Dark borders */
--muted: 217.2 32.6% 17.5%;       /* Muted surfaces */
```

**Rules:**
- Maintain contrast ratios (WCAG AA)
- Test all components in both modes
- Emerald and Amber should remain vibrant
- Reduce pure whites to prevent eye strain

---

## Implementation Checklist

### ✅ Completed
- [x] Professional color palette
- [x] Clean card styling
- [x] Minimalist navigation
- [x] Professional footer

### 🔄 In Progress
- [ ] Plus Jakarta Sans font integration
- [ ] Logic Chip component
- [ ] Reasoning tooltips on automated actions
- [ ] Outcome-first metric ordering on Overview

### 📋 Planned
- [ ] Safe Zone chart variants
- [ ] Confidence Meters component
- [ ] Activity Feed with logic anchoring
- [ ] "Hands-off" visual hierarchy

---

## Quick Reference

| Element | Current | Target |
|---------|---------|--------|
| Display Font | Playfair Display | Plus Jakarta Sans |
| Primary Focus | Feature lists | "Wasted Spend Saved" metrics |
| Action Display | Simple text | Action + Reasoning (Logic Chip) |
| Table Style | Open & Airy | Compact & High-Density |
| Chart Style | Standard lines | Safe Zone visualization |

---

*This document serves as the definitive guide for maintaining PPC Pal's "Watchful Guardian" identity—a calm, explainable, and boundary-respecting automation platform.*
