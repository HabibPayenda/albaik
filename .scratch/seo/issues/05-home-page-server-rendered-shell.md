# 05: Home page server-rendered shell

**What to build:** A request for the home page returns real HTML containing the home title, meta description, canonical URL, absolute Open Graph/Twitter tags, Organization and WebSite JSON-LD, and the page's primary content. React hydrates over it and the page looks and behaves exactly as before.

**Blocked by:** 02 — API runs on MariaDB with migrations (in the MariaDB migration workstream)

**Status:** ready-for-agent

- [ ] The route resolver and HTML shell template are in place for public routes.
- [ ] The home page returns a unique title and description, a self-referencing absolute canonical, Open Graph and Twitter fields with absolute images, and Organization/WebSite JSON-LD.
- [ ] The shell contains the home page's primary crawlable content.
- [ ] React hydrates without duplicate headings, duplicate IDs or stale text.
- [ ] The shell content matches what a visitor sees (no cloaking).
- [ ] HTTP tests assert status, title, description, canonical, social tags and JSON-LD shape.
- [ ] Unknown public paths fall through to the 404 handling delivered by ticket 08; API and upload paths keep their 404s.
