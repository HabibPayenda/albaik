# SEO Delivery and Indexation

**Status:** ready-for-agent

## Problem Statement

Albaik's public site is effectively invisible to search engines, link previews and AI crawlers. Every address — the home page, a Collection, a Brand, a Product, a content page — returns the same near-empty page. The catalogue, titles, descriptions and images only appear after JavaScript loads data from the API.

From the business's point of view:

- A Product added in the dashboard cannot be found on Google. The site has no `robots.txt`, no `sitemap.xml`, no canonical URLs and no structured data.
- A Product shared on WhatsApp, Facebook or LinkedIn shows the same generic square app icon instead of the Product name, photo and description.
- Search results show one generic title and description for the whole site, so Collections, Brands and Products compete with themselves.
- The dashboard and unknown addresses can be indexed; the Verification page can leak printed Verification codes into search.
- Visitors on slow connections see a blank page until the bundle and API calls finish, and crawlers that do not execute JavaScript see nothing at all.
- The site currently returns a temporary redirect from `http` to `https`, serves both `www` and the apex address with 200, and sends no cache policy for its hashed assets.

The goal is English-only organic discovery: Product, Collection, Brand and content pages should be indexable, shareable and citable, with one canonical address per page and no private surface exposed.

## Solution

Every public page is delivered as real HTML. The response already contains the page's title, meta description, canonical URL, Open Graph and Twitter tags, JSON-LD structured data and its primary content — Product name, description, benefits, usage and safety, or the equivalent for a Collection, Brand or content page. The React app still loads and takes over, so the current behaviour, animations and dashboard are unchanged.

A generated `robots.txt` and `sitemap.xml` tell search engines what to crawl. Canonical URLs, 301 redirects and real 404 responses give every page one address. The dashboard, Verification pages, search results and filtered views stay out of the index. Hashed assets are cached for a year while HTML is revalidated. Staff set the public site URL once, and every canonical, sitemap entry and QR code uses it.

Dari and Pashto SEO, hreflang and locale-prefixed URLs are deliberately out of scope. IBN/GTIN markup is deferred: Product structured data omits `gtin13` until every Product has a valid EAN-13 IBN.

## User Stories

### Visitors

1. As a visitor arriving from a search result, I want the page HTML to contain the page title, description and main copy, so that I can read the page even if the JavaScript bundle is slow or blocked.
2. As a visitor sharing a Product on WhatsApp, Facebook or LinkedIn, I want a preview with the Product name, description and a wide image, so that the link looks trustworthy.
3. As a visitor opening a shared Product link, I want the address to be the one canonical Product URL, so that the link I share always works.
4. As a visitor on a slow connection, I want the first response to contain the Product name, benefits and usage, so that I do not stare at a blank page.
5. As a visitor, I want breadcrumbs on Product, Brand, Collection and content pages, so that I can move up the catalogue hierarchy.
6. As a visitor, I want a real not-found page with a 404 response for an unknown address, so that I know the link is wrong.
7. As a visitor, I want the same page whether I type `www` or not, so that bookmarks and shares do not break.
8. As a visitor, I want usage and safety copy to be present in the page rather than only after switching tabs, so that I can make a safe choice and assistive technology can read it.
9. As a visitor, I want pagination links that work without JavaScript, so that I can reach older Products.
10. As a visitor, I want the Verification page to stay out of search results, so that a code I scan is not publicly indexed.

### Search engines and crawlers

11. As Googlebot, I want a `robots.txt` that allows public pages and names the sitemap, so that I can crawl efficiently.
12. As Googlebot, I want a sitemap of every canonical public URL with a last-modified date, so that I can discover new Products and pages.
13. As Googlebot, I want one canonical URL per page, so that I do not index duplicates.
14. As Googlebot, I want 301 redirects from `www` to the apex host, `http` to `https`, and `/brands/:brandSlug` to the collection-scoped Brand URL, so that link equity lands on one address.
15. As Googlebot, I want a 404 for unknown addresses, so that I do not index soft 404s.
16. As Googlebot, I want filtered and search URLs canonicalised or noindexed, so that I do not crawl endless variants.
17. As Googlebot, I want page two and later of a paginated list to self-canonicalise, so that deeper Products remain discoverable.
18. As Googlebot, I want unique titles and descriptions for every Collection, Brand, Product and content page, so that I can tell them apart.
19. As Googlebot, I want Brand titles to include the Collection, so that the four Albaik Brand pages are not duplicates of each other.
20. As Googlebot, I want Organization and WebSite structured data, so that I understand the company and the site.
21. As Googlebot, I want Product structured data with name, image, description, Brand, Collection and SKU, so that I can show rich results.
22. As Googlebot, I want `gtin13` only when a valid EAN-13 IBN exists, so that I never see an invalid identifier.
23. As Googlebot, I want BreadcrumbList structured data, so that I can show the page's place in the hierarchy.
24. As Googlebot, I want ItemList structured data on Collection pages, so that I can understand the Product set.
25. As Bingbot, I want the same server-rendered HTML as Google, so that I do not depend on JavaScript execution.
26. As an AI crawler, I want the page's core content in the HTML, so that the site can be cited in AI answers.
27. As a social crawler, I want absolute `og:image` URLs and per-page Open Graph tags, so that previews are correct.
28. As a search engine, I want `/admin` and `/verify/*` to return noindex directives, so that private surfaces stay out of the index.

### Staff

29. As a staff member, I want to set the public site URL once, so that canonicals, the sitemap and QR codes all use the correct origin.
30. As a staff member, I want a Product meta-description field, so that I can write the search snippet for each Product.
31. As a staff member, I want my Product, Collection, Brand and page edits to appear in the HTML immediately, so that I do not need a rebuild to become discoverable.
32. As a staff member, I want the sitemap to update when I add or remove a Product or page, so that search engines see the current catalogue.
33. As a staff member, I want the dashboard excluded from search results, so that staff screens do not appear in Google.
34. As a staff member, I want Verification codes excluded from the sitemap and marked noindex, so that printed codes are not published.
35. As a staff member, I want the canonical host and sitemap status visible in Settings, so that I can confirm the site is configured correctly.

### Developers

36. As a developer, I want one route resolver that produces the HTML shell for every public page type, so that metadata, canonical and JSON-LD rules live in one place.
37. As a developer, I want the sitemap and canonical builder to share the same URL rules, so that they cannot disagree.
38. As a developer, I want the server shell and the React page to use the same metadata rules, so that crawlers and visitors see the same title and description.
39. As a developer, I want to test SEO behaviour at the HTTP boundary with the existing test host, so that tests assert what crawlers actually receive.
40. As a developer, I want cache headers set once for hashed assets, images and HTML, so that performance does not regress.
41. As a developer, I want redirects handled in middleware, so that they are testable and independent of React.
42. As a developer, I want JSON-LD built from the existing DTOs, so that schema stays in sync with the API.
43. As a developer, I want the SPA to hydrate over the shell without duplicate headings or stale content, so that the visitor experience is unchanged.
44. As a developer, I want unknown `/api` and `/uploads` paths to keep returning 404, so that the SEO shell does not swallow them.

### Business and marketing

45. As a marketer, I want Collection and Product pages to target English queries with Afghanistan intent, so that the site can compete with cross-border retailers.
46. As a marketer, I want the Verification page and wholesale/distribution page to be indexable and internally linked, so that trust and distribution queries land on Albaik.
47. As a marketer, I want a baseline of indexed URLs in Search Console, so that I can measure progress after launch.
48. As a business, I want the site to appear in AI answers and social previews, so that discovery is not limited to Google.

## Implementation Decisions

### Rendering architecture

- A **server-rendered SEO shell** is produced by the API host for every public route. It is not full React SSR: the shell contains the page's metadata, JSON-LD and primary content, and React hydrates over it once the bundle loads.
- A single **route resolver** maps public URL patterns to page types: home, Collections index, Collection, Brand, Product, content page, Contact, Verification page and not-found. Each resolved page returns: HTTP status, canonical path, title, meta description, Open Graph and Twitter fields, JSON-LD blocks and crawlable content HTML.
- The shell is generated per request from the database, so staff edits are live without a rebuild.
- The shell content must match the primary content of the hydrated page. It must never show different Products, prices or claims to crawlers than to visitors (no cloaking).
- The built SPA's asset tags, manifest and service-worker registration are preserved. The React root replaces the shell content after hydration; the shell must not leave duplicate headings, duplicate IDs or stale text behind.
- Admin routes, API routes and upload routes are excluded from the shell resolver. Unknown public routes return the not-found shell with a 404 status. Unknown `/api` and `/uploads` paths remain 404.
- The route resolver, canonical URL builder and sitemap builder share one URL contract, so a page cannot have a canonical URL that the sitemap does not know about.

### Host, redirects and canonical address

- The canonical origin is the apex host `https://albaik-group.af`. If the business prefers `www`, the same rules apply with the preference inverted; the spec assumes apex.
- `www` requests permanently redirect to the apex, preserving path and query.
- `http` requests permanently redirect to `https`, preserving path and query. The current 307 must become a 301.
- Trailing slashes are removed (except the root), and path case is normalised to lower case, with a 301 to the canonical form.
- `/brands/:brandSlug` permanently redirects to the collection-scoped Brand URL. When a Brand appears in several Collections, the redirect uses the first active Brand by sort order; the collection-scoped URL remains the only indexable Brand URL.
- The public site URL setting is the single source of absolute URLs. It must be `https` and must not end with a slash. If it is empty in Development, the request host is used and a warning is logged; in Production, an empty value is a configuration error for sitemap and canonical generation.
- HSTS is enabled only after HTTPS is confirmed on the host, starting with a short max age.

### Metadata rules

- Titles are unique per page and lead with the page subject. The site suffix is short — `Albaik` — not the full company name, so Product titles do not truncate. Home uses the company name and tagline.
- Product title: Product name, then `Albaik`.
- Brand title: Brand name plus Collection name, then `Albaik` (for example, `Albaik Hair Care — Albaik`), so the four Albaik Brand pages are distinct.
- Collection title: Collection name, then `Albaik`.
- Content page title: page title, then `Albaik`.
- Meta descriptions are unique, 120–160 characters, written for search intent and ending with a reason to click. Products use a new editable meta-description field when present, otherwise the short description. Pages use their existing meta-description field. The home description is trimmed to the target length.
- Canonical URLs are absolute, self-referencing and free of tracking parameters. The Collections index canonicalises filtered views to the collection's own URL when a Collection is selected, otherwise to the Collections index. Search-result views are noindex, follow. Page two and later self-canonicalise with their page parameter.
- Open Graph and Twitter tags are emitted per page: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`, `twitter:card` and `twitter:image`. Image URLs are absolute.
- Product pages use the first Product image as the Open Graph image when one exists; otherwise they use a dedicated branded 1200×630 image. The app icon is no longer used as the social image.
- The client-side head manager mirrors the same title, description, canonical and social tags on navigation for the visitor's browser, using the same rules. The server shell remains the source of truth for crawlers.

### Structured data

- A single JSON-LD graph is emitted per page.
- Site-wide: `Organization` (name, URL, logo, contact point, address, and social profiles when configured) and `WebSite` (name, URL).
- Product pages: `Product` with name, absolute image, description, Brand, Collection, SKU (the Product slug) and URL. `gtin13` is included only when the IBN is a valid 13-digit EAN-13; otherwise it is omitted. Offers and availability are omitted while prices are unset or "Price on request". No `AggregateRating` or `Review` until genuine reviews are enabled.
- Product, Brand, Collection and content pages: `BreadcrumbList` matching the visible breadcrumbs.
- Collections index and Collection pages: `ItemList` for the Products or Brands shown.
- JSON-LD is serialised from the existing DTOs, with safe escaping. No hand-written JSON strings in page markup.

### Crawl files

- `robots.txt` is served at the site root with `text/plain`, allows public pages, disallows `/admin` and `/api/`, and names the absolute sitemap URL. The Google verification file and static assets remain allowed.
- `sitemap.xml` is generated from the database and served at the site root with an XML content type. It contains only canonical, indexable URLs: home, Collections index, every active Collection, every active collection-scoped Brand, every active Product, every published content page, and Contact. It excludes the dashboard, Verification pages, search and filtered views, API routes and uploads. Each entry carries a last-modified date from the record's update time where one exists; entries without an update time omit it. URLs are absolute and use the configured public site URL.
- The sitemap is cached briefly and regenerated from the database; no manual rebuild is required when staff add or remove a Product or page.

### Indexation controls

- `/admin` and all dashboard routes return `X-Robots-Tag: noindex, nofollow` and are disallowed in `robots.txt`.
- `/verify/*` returns `X-Robots-Tag: noindex, nofollow`, is excluded from the sitemap and is not linked from indexable pages except through the printed QR code.
- Search-result views and filtered Collections views carry `noindex, follow` or canonicalise to an indexable page.
- Unknown public addresses return the not-found page with a 404 status. The not-found page also carries `noindex`.
- The Google verification file is served as a static file with a 200 response and is not blocked by `robots.txt`.

### Caching and headers

- Hashed build assets receive `Cache-Control: public, max-age=31536000, immutable`.
- Uploaded and bundled images receive a long but finite cache policy.
- HTML shells receive `Cache-Control: no-cache` so content edits are picked up, with an ETag or equivalent revalidation signal.
- `robots.txt` is cached for a day; `sitemap.xml` for a short interval.
- Response compression is already provided by the production host; no application-level compression change is required. Security headers are added: HSTS, `X-Content-Type-Options: nosniff` and a referrer policy. A content security policy is deferred.

### Data and settings

- Product gains an optional meta-description field, editable in the dashboard and exposed through the catalogue DTOs. It does not replace the short description.
- The public site URL setting is validated and normalised. The Settings screen shows the canonical host and whether the sitemap is reachable.
- No schema change is required for IBN; the existing IBN field is read but not enforced or marked up in this scope.
- Social profile URLs already in Settings feed the Organization `sameAs` list when present.

### Front-end changes

- A head manager updates title, description, canonical, Open Graph and Twitter tags on client navigation, using the same rules as the server shell.
- Visible breadcrumbs are added to Product, Brand, Collection and content pages, with matching BreadcrumbList data.
- Product tabs render all panels in the DOM, using the hidden attribute for inactive panels, so usage and safety copy is present after hydration.
- Pagination renders real links with the page parameter, so it works without JavaScript and is crawlable.
- The Collections filters keep their current query-parameter behaviour but canonicalise or noindex as decided above.
- The language switcher remains a UI convenience; no locale URLs, hreflang or translated metadata are introduced.

### Copy rules

- Titles: primary subject first, short suffix, target roughly 50–60 characters.
- Descriptions: 120–160 characters, unique, with a concrete benefit or next step.
- Brand page copy must identify the Collection so the four Albaik pages are distinguishable.
- Collection and Product copy should include Afghanistan intent where it is truthful (for example, availability, distribution or wholesale), but must not invent claims, certifications or performance data.

## Testing Decisions

- **Primary seam:** HTTP responses from the API host, using the existing `AlbaikApiFactory` test host. This is the highest seam and the one crawlers actually see. No new front-end test harness is introduced.
- A good test asserts externally observable behaviour: status code, content type, response headers, canonical link, title, description, Open Graph fields, JSON-LD shape and crawlable content. It does not assert private method names or internal HTML structure.
- Modules covered at the HTTP seam:
  - `robots.txt`: status, content type, allow/disallow rules and sitemap reference.
  - `sitemap.xml`: status, XML content type, complete canonical URL set, absolute apex URLs, last-modified values, and exclusion of admin, Verification, search, filtered, API and upload URLs.
  - Public page shells: home, Collections index, Collection, Brand, Product and content pages each return a unique title, description, canonical and the expected page type's JSON-LD.
  - Product shell: contains the Product name, description, benefits, usage and safety copy, plus Product JSON-LD with Brand, Collection and SKU; omits `gtin13` when the IBN is missing or invalid.
  - Brand pages: the four Albaik Brand pages have distinct titles and canonicals.
  - Redirects: `www` to apex, `http` to `https`, trailing slash to canonical, and `/brands/:brandSlug` to the collection-scoped URL. Redirects are 301 and preserve path and query.
  - 404: unknown public path returns 404; unknown `/api` and `/uploads` paths remain 404.
  - Indexation controls: `/admin` and `/verify/*` carry noindex headers; search and filtered views carry the agreed directive or canonical.
  - Cache headers: hashed assets are immutable; HTML is no-cache; robots and sitemap have their own policies.
  - Verification file: returns 200 with the exact Google body.
- JSON-LD tests parse the script content and assert the `@type`, required properties and the absence of forbidden properties. They do not snapshot the full JSON.
- XML tests parse the sitemap and compare the URL set, rather than matching a raw string.
- Redirect tests send the relevant host and forwarded-proto headers through the test host; if the test host cannot model the edge redirect, the redirect helper is unit-tested and the middleware is covered by one integration test.
- Prior art: the existing API integration tests use `AlbaikApiFactory` and assert endpoint behaviour (for example, Product verification, site copy settings and reorder endpoints). The SEO tests follow that style.
- Manual verification after deployment: Google Rich Results Test for Product and BreadcrumbList, Search Console URL Inspection for a Product and a Collection, social preview debuggers for a Product URL, and PageSpeed Insights for the home and a Product page.

## Out of Scope

- Dari/Pashto SEO, hreflang, locale-prefixed URLs and translated metadata.
- IBN/EAN-13 validation, GTIN enforcement and `gtin13` markup until real IBNs are entered.
- Full React SSR or build-time headless prerendering. The server-rendered SEO shell is the chosen approach.
- A broader content marketing programme: blog, ingredient glossary, FAQ library, comparison pages and campaign landing pages.
- Link building, public relations, local SEO and Google Business Profile work.
- Google Merchant Center feeds and Shopping campaigns.
- Search Console or analytics API integration; verification and reporting remain manual.
- Visual redesign of any public page.
- Deployment and hosting changes beyond application code. Uploading the Google verification file to the live web root remains a manual step.
- Content Security Policy and deeper security hardening.
- Changing the language switcher's behaviour or removing the unused CMS translation path.
- Rewriting Product claims, certifications or performance copy.
- The database platform migration from SQLite to MariaDB (MySQL-compatible). It is specified separately in `.scratch/mysql-migration/spec.md`; the SEO shell must remain provider-agnostic.

## Further Notes

- **Live baseline measured on 5 November 2026:** `https://albaik-group.af/` and every deep link return the same 2,923-byte shell; `robots.txt` and `sitemap.xml` return 404; `/admin` and `/nonexistent-xyz` return 200; `http` returns 307; `www` and the apex both return 200; assets have ETag/Last-Modified but no `Cache-Control`; Brotli compression is active on the production host.
- **Search Console:** the verification file `googlee8f4383e6f9117f0.html` is installed in the source and build output but is still 404 on the live site. Upload it to the live web root, confirm the URL returns 200, then verify the property. Submit the sitemap only after it is live.
- **Canonical host:** the spec assumes `https://albaik-group.af` (apex). If the business chooses `www`, invert the redirect direction and use the chosen host in every canonical, sitemap and QR URL.
- **No cloaking:** the shell's crawlable content must be a truthful subset of the hydrated page. Do not add keywords, claims or Products that a visitor cannot see.
- **PWA compatibility:** preserve the manifest, service-worker registration and asset tags. The shell must not break offline navigation or the install prompt.
- **Product frame:** the 4:5 Product frame rule is unchanged. The Open Graph image is a separate 1200×630 social asset, not a Product frame.
- **Competitive context:** cross-border retailers (Care to Beauty, SweetCare) dominate English "Afghanistan" product queries with large catalogues and localized pages. Local competitors (La Belle, Khan Naseri, Wahedi Rasooly, Zaziano) have weak titles, descriptions and headings; Alokozay is the strongest local FMCG brand but its shampoo pages are thin. Albaik's differentiators are local manufacturing, wholesale distribution and the QR Verification page, especially against reporting on counterfeit shampoo in Kabul.
- **Content priorities after the technical layer:** Collection pages and concern-led Product copy with Afghanistan intent, a trustworthy Verification page, a wholesale/distribution page, and answers to the questions staff actually receive. These are the pages most likely to take space from the cross-border retailers.
- **IBN note:** the one IBN currently stored fails the EAN-13 check digit, so it must not be marked up. Product schema omits `gtin13` until real EAN-13 values are entered; this is deliberate and does not block the rest of the work.
- **Measurement:** after verification, record the indexed URL count, the number of Products with a valid canonical, and the Core Web Vitals baseline before the change, so the outcome can be compared later.
- **Database migration:** the SQLite-to-MariaDB move is a separate spec and workstream. The SEO shell reads through the existing data layer and must not introduce SQLite-specific queries; once the MariaDB migration lands, the SEO integration tests should run on MariaDB so the production provider is exercised.
