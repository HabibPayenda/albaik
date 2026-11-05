# Albaik Group of Companies — website

Marketing site and content management system for **Albaik Group of Companies**
(*"The Mark of Pure Perfection"*), an Afghanistan-based personal-care, beauty,
hair-care, oral-care and everyday-products company. Two brands are represented in
the catalogue: **Albaik** and **Avora Shine**.

The public site is entirely database-driven: every heading, product, collection,
page and menu entry is editable from the admin dashboard.

```
Albaik/
├── api/                          .NET 10 Web API + EF Core + MariaDB
├── web/                          React 19 + Vite + Tailwind v4 SPA (PWA)
├── AlbaikDesign/                 Source design system and HTML mockups
└── Albaik_Website_Content_2026_English.docx    Approved copy (source of truth)
```

---

## Requirements

| Tool | Version used |
|---|---|
| .NET SDK | 10.0.301 |
| Node.js | 22.22.2 |
| npm | bundled with Node |
| MariaDB | 10.5 or newer (local: 13.0.2; production target: 10.10) |

MariaDB 10.5+ is a hard prerequisite. MySQL 8.0 is also supported if the host
changes; MySQL 5.7 is end of life and is not supported. The API uses
Pomelo.EntityFrameworkCore.MySql 9.0.0 with EF Core 9.0.x and pins MariaDB 10.10
as the server version, so local and production generate the same SQL.

No global installs are needed. No CDN access is required at runtime — fonts, icons
and styles are all bundled so the site works offline.

---

## Running it

Two processes: the API and the SPA dev server.

### 1. API — http://localhost:5080

```bash
cd api
dotnet run --urls http://localhost:5080
```

The API needs a MariaDB database. On first run it applies the checked-in EF
migrations (creating the schema) and seeds the catalogue and site content taken
from the approved `.docx`. The seed is idempotent — restarting does not duplicate
rows, and it skips catalogue/settings content that was already imported.

Create the local database once:

```sql
CREATE DATABASE albaik CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

`api/appsettings.Development.json` points at the local
`Server=127.0.0.1;Port=3306;User=root;Password=;Database=albaik;CharSet=utf8mb4`
instance. Production supplies the real connection string through
`ConnectionStrings__Default` (see [Configuration](#configuration)); it is never
committed.

### 2. SPA — http://localhost:5173

```bash
cd web
npm install
npm run dev
```

Vite proxies `/api` and `/uploads` to `http://localhost:5080`, so the browser only
ever talks to port 5173. Open **http://localhost:5173**.

### Admin dashboard

Go to **http://localhost:5173/admin** (or click *Administration* in the header).

```
username:  admin
password:  Albaik@2026
```

Change this password immediately from **Settings → Security**. The dashboard shows
a "before going live" checklist that repeats this.

---

## Building for production

```bash
cd web
npm run build          # runs tsc -b, then vite build, then generates the service worker
```

Output lands in `web/dist/`. Serve it from any static host, or publish it from the
API by copying `web/dist/*` into `api/wwwroot/` — the API already calls
`UseStaticFiles()`, so a single process then serves both the site and the API and
the relative `/api` base URL keeps working.

---

## What's in the box

### Public site

- **Home** — hero, collections, signature formulations with filter pills, the
  interactive hair-profile selector, trust ribbon, distribution panel.
- **Catalogue** — `Collections → Collection → Brand → Products → Product detail`.
  The full hierarchy is navigable from the header mega-menu as well.
- **Content pages** — About, Quality, Safety, Distribution, Privacy, Terms, plus
  guide pages. All CMS-driven.
- **Contact** — validated form with honeypot spam protection, an enquiry-type
  selector and a wholesale variant.
- **PWA** — installable, offline-capable. API responses are cached `NetworkFirst`,
  uploaded images `CacheFirst`.

### Admin dashboard

| Group | Screens |
|---|---|
| Overview | Dashboard with counts, recent enquiries, go-live checklist |
| Catalogue | Collections, Brands, Products, full Product editor with image upload |
| Website content | Home page sections, Hero statistics, Testimonials, Trust ribbon, Hair profiles, Menus & footer, Pages |
| Inbox | Contact / wholesale / newsletter messages |
| System | Site settings and password |

---

## Content integrity — read this before editing copy

The source document states that **ingredient lists, percentages, certifications,
technical specifications and performance claims must come from approved official
product documentation.** The site is built to make that easy to honour:

- Product **prices are seeded empty** and render as *"Price on request"*. Set real
  prices per product, or turn prices off globally in **Settings → Catalogue**.
- **Testimonials ship disabled.** The three seeded rows are placeholders; nothing
  appears on the site until you publish genuine, attributable reviews.
- **Ingredient lists are not invented.** Products carry short technology tags only,
  and the product page states that INCI data comes from approved documentation.
- The hair-profile panel shows a **statistic only when one has been supplied**
  (`metricValue`). Otherwise it shows the matched formulation instead of inventing
  a percentage.
- Products without photography fall back to a branded gradient plate rather than
  borrowing a stock image.

### Contact email

The contact form always **stores** the enquiry, so nothing is lost. Sending the
notification email requires SMTP credentials, which are intentionally left blank.
**Settings** shows a live status card telling you whether mail is configured, and
lists the exact keys to fill in `api/appsettings.json`:

```jsonc
"Smtp": {
  "Host": "smtp.example.com",
  "Port": "587",
  "UseStartTls": "true",
  "Username": "you@example.com",
  "Password": "…",
  "FromAddress": "no-reply@albaik-group.com",
  "FromName": "Albaik Group of Companies",
  "NotifyAddress": "info@albaik-group.com"   // who receives the enquiry
}
```

Until then the dashboard inbox is the only channel — each message is flagged
*"Not emailed"* so you can see at a glance which ones still need a reply.

**Test the mail path before you have a provider.** `api/tools/smtp-sink.py` is a
dependency-free SMTP server that captures messages instead of sending them, so you can
confirm the templates, recipients and Reply-To wiring without real credentials:

```bash
# terminal 1
python api/tools/smtp-sink.py                      # listens on 127.0.0.1:2525

# terminal 2 — environment overrides, so nothing is written to appsettings.json
cd api
Smtp__Host=127.0.0.1 Smtp__Port=2525 Smtp__UseStartTls=false \
Smtp__FromAddress=no-reply@albaik-group.com \
Smtp__NotifyAddress=inbox@albaik-group.com \
dotnet run --urls http://localhost:5080
```

Submit the contact form, then read terminal 1. Each message is also saved as a `.eml`
file under `api/tools/captured-mail/` (gitignored) that you can open in a mail client.

Two emails are expected per submission: the **notification** to `NotifyAddress` with
`Reply-To` set to the enquirer, and the **auto-reply** to the enquirer with `Reply-To`
set to `NotifyAddress` — so replying to either one reaches the right place. Both are
sent as `multipart/alternative` (a `text/plain` part alongside the HTML), because
HTML-only mail is unreadable in text clients and scores worse with spam filters.

---

## Configuration

`api/appsettings.json`:

| Key | Purpose |
|---|---|
| `ConnectionStrings:Default` | MariaDB connection string. Empty in `appsettings.json`; supply it with the `ConnectionStrings__Default` environment variable (or host configuration). |
| `Cors:Origins` | Comma-separated allowed origins for the dev SPA |
| `Jwt:Key` | Signing key — **must be at least 32 bytes**. Replace in production. |
| `Jwt:ExpiryHours` | Admin session length (default 12) |
| `Seed:AdminUsername` / `Seed:AdminPassword` | Credentials created on first run |
| `Smtp:*` | Outbound mail, as above |

`web/vite.config.ts`:

| Key | Purpose |
|---|---|
| `VITE_API_TARGET` (env) | Proxy target, defaults to `http://localhost:5080` |

---

## Database operations

### Migrations

```bash
dotnet ef migrations add <Name> --project api --output-dir Migrations
dotnet ef database update --project api
```

Run these with `ConnectionStrings__Default` pointing at the target database (or rely
on the Development connection string). The startup migration path is enough for a
normal deploy; apply migrations explicitly only when the host runs schema changes as
a separate step.

### Importing an existing SQLite database

The one-off importer lives in `api/Albaik.Importer` and is not part of the running
API. Pass a **copy** of the live SQLite file and the target MariaDB connection string:

```bash
dotnet run --project api/Albaik.Importer -- \
  --source C:\backup\albaik.db \
  --target "Server=127.0.0.1;Port=3306;User=root;Password=;Database=albaik;CharSet=utf8mb4" \
  --migrate
```

It preserves primary keys, timestamps, admin password hashes and Verification codes,
and verifies per-table row counts and content checksums. Re-run a failed import with
`--force`. See `api/Albaik.Importer/README.md` for options and exit codes.

### Tests

The integration suite boots the real API against a uniquely named MariaDB database
and drops it afterwards. It needs a reachable server; override the default
(`127.0.0.1:3306`, `root`, blank password) with `ALBAIK_TEST_MYSQL`:

```bash
export ALBAIK_TEST_MYSQL="Server=127.0.0.1;Port=3306;User=root;Password=;CharSet=utf8mb4"
dotnet test api/tests/Albaik.Api.Tests/Albaik.Api.Tests.csproj
```

The suite fails with a clear prerequisite message if MariaDB is unreachable.

### Cutover

The production switch from the legacy SQLite file to MariaDB — pre-flight backup,
ordered cutover, smoke tests, rollback and retention — is documented in
[`docs/mariadb-cutover.md`](docs/mariadb-cutover.md). The staging rehearsal is a
required gate before production.

---

## Project notes

- **Migrations own the schema.** The API calls `MigrateAsync()` at startup and never
  calls `EnsureCreatedAsync()`; the old SQLite schema guard is gone. Add a migration,
  review it, apply it, and never edit the database by hand:

  ```bash
  # from the repository root
  dotnet ef migrations add <Name> --project api --output-dir Migrations
  dotnet ef migrations script --project api            # optional: review the SQL
  dotnet ef database update --project api              # apply to ConnectionStrings:Default
  ```

  Startup fails fast with a clear message if `ConnectionStrings:Default` is missing,
  and a failed migration stops startup rather than serving a half-migrated database.
  The health endpoint (`/api/health`) reports database connectivity.
- **Design tokens** live in `web/src/index.css` under Tailwind v4's `@theme`.
  There is no `tailwind.config.js`; the palette and type scale come from
  `AlbaikDesign/design.md/DESIGN.md` ("Royal Sapphire Luminescence").

  **Every colour in a component must resolve to a token.** The palette is auditable —
  collect the hex values from `DESIGN.md` and from `@theme`, then diff them against
  every `.tsx`; the result should be empty. Three rules that keep it that way:

  - The royal gradient has exactly three documented stops — `#050d24` → `#0e3b9c` →
    `#1a4fcf`. Don't add a fourth to tint it.
  - Gold `#d4af37` is reserved for emblems, star ratings and hairline borders. It fails
    contrast as *text* on a light surface, so use `text-accent-gold-ink` (on a gold tint)
    or `text-accent-gold-deep` (on a solid gold fill). The current `accent-gold-ink`
    value (`#7d621b`) was selected by measured contrast rather than eyeball: it clears
    WCAG AA (4.5:1) at the worst case it is actually used — the 10px formulation chips
    sitting on a `bg-accent-gold/15` wash — coming in at **4.78:1**. The earlier value
    (`#8a6d1f`) measured 4.05:1 and failed. Re-check after any change with
    `node .workbuddy-ai/scripts/cdp-probe.mjs <url> --js=.workbuddy-ai/scripts/contrast.js`
    rather than assuming darker is dark enough.
  - The spec defines `error` but no success/warning pair, so the dashboard's status
    colours are named tokens: `--color-success(-container)`, `--color-warning(-container)`.

  Known doc bug: DESIGN.md contradicts itself on the neutral — its token block says
  `surface: '#f7f9fc'` (which is implemented) while the prose says `#f8fafd`.
- **`cn()` is configured** in `web/src/lib/utils.ts` to teach `tailwind-merge`
  about the custom `--text-*` tokens. Without that it misreads `text-label-lg` as a
  colour and silently drops `text-white` from gradient buttons.
- **Icons** are locally bundled Lucide glyphs behind `components/ui/Icon`, which
  maps Material-Symbols names. Brand marks (Facebook/Instagram/LinkedIn/TikTok)
  live in `components/ui/BrandIcons.tsx` — Lucide removed its brand icons.
- **PWA icons** are generated by `web/scripts/make-icons.py` (pure Python, no
  dependencies): `python scripts/make-icons.py`.
- **Bundle shape.** Vendor code is split into cacheable chunks and every route below
  the landing page is lazy, so a content deploy invalidates ~23 kB gz of app code
  rather than the whole bundle:

  | Chunk | gzip |
  | --- | --- |
  | `vendor-react` (react, react-dom, react-router) | 92.7 kB |
  | `vendor-motion` (framer-motion) | 44.0 kB |
  | `index` (shell + home page) | 22.6 kB |
  | `vendor-http` (axios) | 18.1 kB |
  | `vendor` / `vendor-icons` / `vendor-state` / `vendor-scroll` | 36.1 kB |

  First load is ~231 kB gz, and it is ~95% vendor code — the app's own code is only
  22.6 kB of that. Cutting it further means dropping a library, not refactoring pages.
  The only real remaining lever is `framer-motion` (44 kB gz); `LazyMotion` would not
  help because the `layoutId` tab indicators need the full `domMax` feature set, and
  the library is used in 131 places across 31 files.

- **`vite preview` proxies `/api` and `/uploads`** so the production bundle can be
  smoke-tested locally (`npm run build && npx vite preview`). Without that mirror of
  the dev proxy every page renders its error state and the test proves nothing.

- **Production `dist/` must be cleared before rebuilding** in this environment: the
  sandbox's safe-delete shim refuses to empty `dist/assets` once it holds more than
  50 files. `Remove-Item -Recurse -Force web/dist` first, then build.
