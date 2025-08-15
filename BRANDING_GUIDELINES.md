# PPC Pal - Branding Guidelines

## Brand Philosophy

PPC Pal embodies clean, minimalistic, and modern design principles. Our interface prioritizes clarity, usability, and professional aesthetics over flashy effects and vibrant colors. We believe in creating a sophisticated, functional experience that helps users focus on their Amazon PPC optimization without visual distractions.

## Core Design Principles

### 1. Minimalism First
- Remove unnecessary visual elements
- Focus on essential functionality
- Use whitespace effectively
- Avoid decorative gradients and glows

### 2. Professional Aesthetics
- Clean typography hierarchy
- Subtle shadows and borders
- Consistent spacing and alignment
- Professional color palette

### 3. Modern Functionality
- Intuitive user interactions
- Responsive design across all devices
- Accessible components
- Performance-optimized animations

## Color Palette

### Primary Colors
```css
--primary: 222.2 47.4% 11.2%;           /* Deep navy for primary actions */
--primary-foreground: 210 40% 98%;      /* Clean white text */
--secondary: 210 40% 96.1%;             /* Light neutral backgrounds */
--secondary-foreground: 222.2 47.4% 11.2%;
```

### Neutral Colors
```css
--background: 0 0% 100%;                /* Pure white background */
--foreground: 222.2 84% 4.9%;          /* Dark text */
--muted: 210 40% 96.1%;                /* Subtle backgrounds */
--muted-foreground: 215.4 16.3% 46.9%; /* Secondary text */
--border: 214.3 31.8% 91.4%;           /* Clean borders */
```

### Brand Colors (Professional)
```css
--brand: 220 14% 96%;                   /* Clean brand background */
--brand-foreground: 220 9% 46%;        /* Professional brand text */
```

### Shadow System
```css
--shadow-sm: 0 1px 2px 0 hsl(var(--foreground) / 0.05);
--shadow-md: 0 4px 6px -1px hsl(var(--foreground) / 0.1), 0 2px 4px -1px hsl(var(--foreground) / 0.06);
--shadow-lg: 0 10px 15px -3px hsl(var(--foreground) / 0.1), 0 4px 6px -2px hsl(var(--foreground) / 0.05);
--shadow-xl: 0 20px 25px -5px hsl(var(--foreground) / 0.1), 0 10px 10px -5px hsl(var(--foreground) / 0.04);
```

## Typography

### Font Stack
- **Primary**: Inter (clean, modern sans-serif)
- **Display**: Playfair Display (elegant serif for headings)

### Typography Scale
- **Hero Text**: 5xl-8xl (80px-128px) - Bold, clean headlines
- **Headings**: 2xl-4xl (24px-36px) - Professional hierarchy
- **Body**: base-lg (16px-18px) - Readable content
- **Small**: sm (14px) - Labels, captions

### Usage Guidelines
- Use consistent font weights (400, 500, 600, 700)
- Maintain proper line height ratios (1.2-1.6)
- Ensure sufficient color contrast
- Avoid gradient text effects

## Component Guidelines

### Buttons
```tsx
// Clean button variants
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Style</Button>
<Button variant="ghost">Ghost Style</Button>
```

**Design Rules:**
- No gradient backgrounds
- Subtle hover effects
- Clean border radius (rounded-md)
- Consistent padding and heights
- Professional color palette only

### Cards
```tsx
// Modern card styling
<Card className="border bg-card shadow-sm">
  <CardHeader>
    <CardTitle>Clean Title</CardTitle>
    <CardDescription>Professional description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

**Design Rules:**
- Clean white backgrounds
- Subtle shadows (shadow-sm to shadow-md)
- No backdrop blur effects
- Consistent border radius
- Professional spacing

### Data Display (KPI Chips)
```tsx
// Clean metric display
<KpiChip 
  label="ROAS" 
  value="4.1x" 
  change={{ value: '3.0%', direction: 'up' }}
/>
```

**Design Rules:**
- Remove animated accents
- Clean borders and backgrounds
- Professional color indicators
- Consistent spacing and typography

## Layout Guidelines

### Spacing System
- Use consistent spacing scale (4px, 8px, 16px, 24px, 32px, 48px)
- Maintain proper visual hierarchy
- Apply generous whitespace
- Ensure balanced compositions

### Grid and Alignment
- Use CSS Grid and Flexbox properly
- Maintain consistent alignment
- Responsive breakpoints (sm, md, lg, xl)
- Clean gutters and margins

## Animation Guidelines

### Approved Animations
```css
/* Subtle, functional animations only */
transition-colors duration-200    /* Color transitions */
hover:shadow-md                   /* Shadow changes */
animate-fade-in                   /* Content appearance */
```

### Forbidden Effects
- ❌ Pulse glows and electric effects
- ❌ Floating decorative shapes
- ❌ Gradient animations
- ❌ Complex 3D transforms
- ❌ Overly bouncy animations

## Dark Mode Considerations

### Dark Mode Palette
```css
--background: 222.2 84% 4.9%;     /* Dark background */
--foreground: 210 40% 98%;        /* Light text */
--card: 222.2 84% 4.9%;          /* Dark cards */
--border: 217.2 32.6% 17.5%;     /* Dark borders */
```

**Implementation:**
- Maintain contrast ratios
- Test all components in both modes
- Ensure professional appearance
- Avoid overly bright accents

## Implementation Checklist

### ✅ Completed
- [x] Removed electric color palette
- [x] Simplified button variants
- [x] Clean card styling
- [x] Professional navigation
- [x] Minimalist hero section
- [x] Clean KPI chips
- [x] Removed floating shapes
- [x] Professional footer

### Component Audit
- [x] Landing page - Simplified and professional
- [x] Button component - Removed pill and hero variants
- [x] Card component - Clean styling
- [x] KPI chips - Professional display
- [x] Feature tiles - Minimal design
- [x] Navigation - Clean header

## Usage Examples

### Landing Page Hero
```tsx
// Clean, professional hero
<h1 className="text-5xl font-bold">
  Smarter Amazon PPC.
  <br />
  <span className="text-muted-foreground">Cinematic simplicity.</span>
</h1>
```

### Professional CTA
```tsx
// Simple, effective call-to-action
<Button size="lg" className="px-8 py-3">
  <Zap className="mr-2 h-5 w-5" /> Start optimizing
</Button>
```

### Clean Data Visualization
```tsx
// Professional metrics display
<div className="grid gap-4 md:grid-cols-4">
  <KpiChip label="Spend" value="$12.3k" />
  <KpiChip label="Clicks" value="48,921" />
  <KpiChip label="ACOS" value="24.6%" />
  <KpiChip label="ROAS" value="4.1x" />
</div>
```

## Brand Voice

### Tone
- Professional yet approachable
- Confident without being arrogant
- Clear and direct communication
- Focus on user benefits

### Messaging Principles
- Emphasize simplicity and efficiency
- Highlight professional capabilities
- Use clean, jargon-free language
- Focus on measurable results

---

*This document serves as the definitive guide for maintaining PPC Pal's clean, minimalistic, and professional brand identity across all touchpoints.*