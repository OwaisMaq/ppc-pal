

## Update Blog Links to ppcpal.online/blog

Change all blog links from `https://ppcpal.blog` to `https://ppcpal.online/blog` across three locations.

---

### Changes

| File | Location | Change |
|---|---|---|
| `src/pages/PublicLanding.tsx` | Nav bar (line 67) | Update href to `https://ppcpal.online/blog` |
| `src/pages/PublicLanding.tsx` | Footer (line 960) | Update href to `https://ppcpal.online/blog` |
| `src/components/AppSidebar.tsx` | Sidebar menu item (line 71) | Update url to `https://ppcpal.online/blog` |

No other code changes needed -- the external link handling already works correctly.

---

### DNS Reminder

Make sure your `ppcpal.online` domain has an A record or CNAME pointing to your WordPress host. WordPress should be configured to serve from the `/blog` path (either via subdirectory install or reverse proxy).

