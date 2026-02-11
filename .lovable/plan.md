

## Add Blog Links to PPC Pal (ppcpal.blog)

Simple update: add "Blog" links pointing to `https://ppcpal.blog` in three places.

---

### Changes

**1. Landing page nav bar** (`src/pages/PublicLanding.tsx`, line 62-66)
- Add a "Blog" link after "About", opening in a new tab:
  `<a href="https://ppcpal.blog" target="_blank" rel="noopener noreferrer">Blog</a>`

**2. Landing page footer** (`src/pages/PublicLanding.tsx`, line 955-958)
- Add a "Blog" link alongside Privacy, Terms, Contact.

**3. App sidebar** (`src/components/AppSidebar.tsx`, line 60-70)
- Add a "Blog" entry to the menu items array with an `external: true` flag and `url: "https://ppcpal.blog"`.
- Update the NavLink rendering to use a regular `<a>` tag with `target="_blank"` for external links.
- Use the `BookOpen` icon from lucide-react.

---

### Files

| File | Change |
|---|---|
| `src/pages/PublicLanding.tsx` | Add "Blog" link to nav bar and footer |
| `src/components/AppSidebar.tsx` | Add external "Blog" link to sidebar menu |

---

### DNS Reminder

Make sure your `ppcpal.blog` domain DNS is pointed to your WordPress host. This is configured at your domain registrar -- your WordPress hosting provider will give you the A record or CNAME value to use.

