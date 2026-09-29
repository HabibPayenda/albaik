# 01 — Reorderable dashboard lists

**What to build:** Staff can change the display order of any repeatable content collection from the dashboard — testimonials, trust pillars, hair profiles, hero statistics, home sections, navigation links, footer links and collection pages — using the same up/down controls everywhere. The order staff choose is the order visitors see, immediately, without a redeploy.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every dashboard list that the public site renders in a defined order exposes the same reorder control.
- [ ] Reordering persists to the server and the public page reflects the new order without a redeploy.
- [ ] The API accepts an ordered id list for a collection and updates positions for all affected rows.
- [ ] Existing list behaviour — search, edit, delete, add — keeps working after reorder is introduced.