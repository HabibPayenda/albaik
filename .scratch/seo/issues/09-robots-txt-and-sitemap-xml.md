# 09: robots.txt and sitemap.xml

**What to build:** Search engines can fetch a real `robots.txt` and a sitemap listing every canonical public URL. The sitemap excludes dashboard, Verification, search, filtered, API and upload URLs and uses the configured public site URL.

**Blocked by:** 08 — Content, Contact, Verification and 404 shells

**Status:** ready-for-agent

- [ ] `robots.txt` returns 200 `text/plain`, allows public pages, disallows the dashboard and API, and names the absolute sitemap URL.
- [ ] The Google verification file is allowed.
- [ ] `sitemap.xml` returns 200 XML and contains home, Collections index, every active Collection, every active collection-scoped Brand, every active Product, every published content page and Contact.
- [ ] The sitemap excludes dashboard, Verification, search, filtered, API and upload URLs.
- [ ] URLs are absolute and use the configured public site URL; lastmod is present where the record has an update time.
- [ ] XML tests parse the sitemap and compare the URL set; robots tests assert the rules.
