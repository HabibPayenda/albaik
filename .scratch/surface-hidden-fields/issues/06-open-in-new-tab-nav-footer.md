# 06 — Nav and footer links honour "open in a new tab"

**What to build:** A navigation link or footer link marked "open in a new tab" opens external links in a new tab, the way Quick links already do. An internal route keeps the site's client-side navigation, and an unflagged link is unchanged, so the flag never forces a full page reload for an in-site link.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A nav or footer link flagged open-in-new-tab and pointing at an external address opens in a new tab.
- [ ] An internal route with the flag set still navigates within the site (no full reload).
- [ ] Unflagged links behave exactly as before.
