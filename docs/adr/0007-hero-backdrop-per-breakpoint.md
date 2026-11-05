# The hero backdrop is one composition per breakpoint, not one picture cropped four ways

The hero banner is art-directed. The designer supplies four compositions of the
same campaign — 2560×1086 (about 2.36:1), 1920×1080 (16:9), 1536×1153 (4:3) and
1080×1441 (3:4 portrait) — because the copy has to sit in negative space at every
screen shape. One wide picture cannot do that: at 390×780 the old single banner
lost most of the frame to the crop, and the subject went with it (ADR 0003
measured this).

So a slide now carries a **set**: `backdrops: { ultrawide, desktop, tablet, mobile }`
on the slide's JSON, with `defaultBackdrops` on the section for slides that carry
none. The hero paints them through `<picture>` with one `<source media>` per
breakpoint, widest first, because the first matching media query wins. The mobile
file is also the `<img src>`, so a browser without `<picture>` support — and the
moment before the sources resolve — still shows a complete picture.

## Breakpoints

| variant | media query | composition |
| --- | --- | --- |
| ultrawide | `(min-width: 1600px)` | 2560×1086, 2.36:1 |
| desktop | `(min-width: 1024px)` | 1920×1080, 16:9 |
| tablet | `(min-width: 768px)` | 1536×1153, 4:3 |
| mobile | default (`<img src>`) | 1080×1441, 3:4 portrait |

The 1600/1024/768 edges are where the artwork changes character, not arbitrary
round numbers: below 768 the copy column needs the tall composition, and at 1600
the ultrawide band is what a large display actually shows.

## Fallback

A half-built slide must still render. Resolution is: the slide's own variant →
the next **wider** variant → the slide's legacy single `backdrop` → the section's
default set (same rule) → the royal gradient. Falling back to a wider picture
rather than a narrower one means an under-supplied slide is cropped by
`object-cover`, never upscaled.

The legacy single `backdrop` field is kept, not migrated away. Published rows
point at `/hero-banner.webp`; deleting the field would blank their hero. It is
editable as "Fallback for any size" and only matters when a slide has no set.

## Upload

Each breakpoint uploads to its own path, `POST /api/admin/upload/backdrop/{variant}`,
with its own dimension ceiling under the same 300 KB byte ceiling
(`ImagePipeline.Limits.BackdropUltrawide/Desktop/Tablet/Mobile`). The variant is a
path segment rather than a query string for the reason ADR 0002 gives for the
route itself: the guarantee must not depend on a caller-supplied argument. An
unknown variant is a 400, not a silently looser ceiling.

The mobile ceiling is 1440 rather than 1080 because the pipeline caps the *longest
edge*, and the mobile artwork is portrait: capping at 1080 would shrink its width
to 809. `optimise-assets.py` carries the same per-slide ceilings for the bundled
files, so a hand-optimised file and an admin upload land in the same shape.

## Cost

Only one file is fetched per visitor, so the extra variants do not add transfer
weight at runtime. The bundled set totals about 188 KB (55 + 48 + 43 + 42 KB) and
is precached because `globPatterns` lists `webp` — four files, not four times the
old install. The 300 KB ceiling is per file, and `verify-hero-variants.mjs` asserts
both the ceiling and that each viewport's `currentSrc` is the expected variant.

## Composition: the whole picture, and text that cannot land on white

Two rules follow from having four uploadable compositions rather than one fixed banner.

**The whole picture is shown, inside one screen.** The hero is `min-h` of
`100svh` minus the site chrome, and the picture is painted `object-contain`. It is
never cropped, and it is never taller than the space it starts in, so the whole
composition is visible without scrolling at every breakpoint. The chrome height is
measured into `--site-chrome-h` by `SiteLayout` rather than hard-coded, because the
announcement ticker is empty when no announcements are set. The old aspect-lock is
gone: it made the hero the picture's height, which pushed the picture past the fold
whenever the viewport was short.

**Legibility never depends on the photograph.** White type over an uploadable image
cannot rely on the image being dark where the copy happens to land, so each
breakpoint gets a scrim sized to where the copy actually is:

| breakpoint | copy | scrim |
| --- | --- | --- |
| phone (<768) | bottom of the composition, below its bright upper band | solid `#050d24`/90 from the copy's first line down, 6rem fade above |
| tablet (768–1023) | one column spanning the composition | flat `#050d24`/78 over the whole frame |
| desktop (≥1024) | beside the subject, on the composition's dark side | horizontal gradient, 95% → 85% at 65% of a 72%-wide band, then out |

The phone copy starts at two-thirds of the portrait picture's rendered height
(`--hero-copy-top`, derived from the loaded file's natural size), because the mobile
artwork is bright across its top half. Measured with a near-white upload through the
real route, the worst text run holds 5.3:1 or better at every breakpoint, and 5.9:1
in RTL. `verify-hero.mjs` re-measures both facts — the picture's painted box inside
the fold, and the topmost text run below the picture's bright band — against the
rendered page rather than the stylesheet.

ADR 0003's bar-cost table still describes the ultrawide tier; the other three tiers
have their own proportions and therefore their own bars.
