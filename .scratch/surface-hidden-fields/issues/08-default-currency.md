# 08 — The default currency setting drives new products and the price fallback

**What to build:** The configured default currency is what a new product starts with — the product editor's Currency field defaults to it — and it is the fallback used to format a price when a product has none of its own. So the setting is no longer inert.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A new product's Currency field starts at the configured default currency.
- [ ] Formatting a price with no product currency uses the configured default.
- [ ] Changing the setting changes both, with no redeploy.
