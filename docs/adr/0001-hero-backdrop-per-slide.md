# The hero carries one picture per slide, not a product picture

The home hero previously showed a right-hand panel holding a product
photograph, a slide badge and a product detail strip. That panel is removed: the
hero now carries exactly one image, the slide's **picture**, and all text sits to
one side over it. The badge and the product strip move into the copy column rather
than being deleted, so a field an editor fills is never a field the page silently
ignores.

A picture resolves as `slide backdrop → default backdrop → royal gradient`. A
slide with no picture of its own inherits the section's default, so a half-built
carousel still looks finished. The two rejected alternatives: a blank slide
meaning "no photograph" (a newly added slide then looks unfinished, and the
section-level field becomes slide 1's picture in disguise); and an explicit
three-state field (more expressive, more states an editor can get wrong).

The picture is painted `object-contain`, so it is complete rather than full-bleed —
see ADR 0003 for why, and for what the letterbox bar costs at each viewport. The
stored field is still called `backdrop`, which is now a naming debt: the image is
no longer only "behind" the copy, and `CONTEXT.md` defines the term that way. It was
left alone deliberately rather than renamed here, because the rename reaches the DB
row, the editor, the upload route and its folder, and nothing about the rendered
result depends on it.

Consequences worth remembering: the default picture is currently **unset**,
because slides 2–3 have none of their own — slide 1 is pinned to
`/hero-banner.webp` and slides 2–3 deliberately fall through to the gradient.
The default field is retained because the chain needs it, not because it is
currently in use. Focal point is per-slide, which is the reason a slide carries
a focal point and not just a picture.

The artwork is pinned to slide 1 **by index**, not by title, so reordering slides
in the dashboard cannot silently move the photograph onto the wrong copy.

The old `slide.image` field held a *product plate* image, so the rename to
`backdrop` is a change of meaning and not a change of name. A product shot is the
wrong thing to stretch full-bleed, so the migration reports any non-empty old
value and leaves that slide's backdrop empty for a human to replace, rather than
reusing the art. `.workbuddy-ai/scripts/migrate-hero-backdrops.mjs` performs the
rename on the live row — shape only, every word of copy is read back and written
back untouched — and is idempotent, so a second run reports "no change".

The bundled banner is `.webp`, not `.jpeg`, and that is a PWA decision rather than
an aesthetic one: the precache glob lists `webp` and not `jpeg`, so a bundled JPEG
picture is in no cache at all — missing on a cold offline install and re-fetched
on every load while online. `.workbuddy-ai/scripts/optimise-assets.py backdrops`
produces it (2560px, ≤300 KB), and it came out at 84 KB against the source's 253 KB
with a worst per-band luminance difference of 0.12/255. As a real `<img>` the
offline claim is now checked more directly than a background allowed:
`verify-hero-offline.mjs` asserts the element's intrinsic size is still 2560×1086
with the network cut, which a `background-image` could not report.
