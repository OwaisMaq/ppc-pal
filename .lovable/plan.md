

# Plan: Create /solutions marketing page

## Summary
Create a new public marketing page at `/solutions` that describes PPC Pal's analytics and reporting services. The page follows the existing dark fintech UI patterns used in `PublicLanding.tsx` and `About.tsx` (same header/footer structure, same component library, same styling conventions).

## What will be built

**New file: `src/pages/Solutions.tsx`**

A standalone public page with these sections:

1. **Header** -- Reuses the same sticky nav pattern (PPC Pal logo, nav links to Home/About/Contact, Sign in + CTA buttons)

2. **Hero** -- "Amazon Advertising Analytics & Optimisation for Sellers" headline with two-line subheading about analysing PPC performance, uncovering wasted spend, and data-driven bid decisions. CTA button linking to `/waitlist`.

3. **Services** -- 4 feature cards in a 2x2 grid (lg:4-col on desktop):
   - Search Term Analytics
   - Campaign Performance Reporting
   - Bid Optimisation Insights
   - Advertising Audit

   Each card uses the existing `Card` component with an icon, title, and real descriptive copy.

4. **Who It's For** -- Three audience segments (FBA/FBM Sellers, Brand Owners, Agencies) with icons and copy, displayed in a 3-col grid.

5. **CTA Section** -- "Request Early Access" button linking to `/waitlist`.

6. **Footer** -- Company name (WISH AND WILLOW LTD), contact email (info@ppcpal.online), Privacy Policy link. Matches existing footer pattern.

**Modified file: `src/App.tsx`**
- Add lazy import for Solutions page
- Add public route: `<Route path="/solutions" element={<Solutions />} />`

**Modified file: `src/pages/PublicLanding.tsx`**
- Add "Solutions" link in the header nav alongside Features/Pricing/FAQ/About/Blog

## Technical details
- Uses existing `Card`, `Button`, `Link` components
- Icons from `lucide-react` (Search, BarChart3, Target, ClipboardCheck, ShoppingCart, Building2, Users)
- Same responsive patterns: mobile-first, `container mx-auto px-4`
- All copy is final -- no placeholder text

