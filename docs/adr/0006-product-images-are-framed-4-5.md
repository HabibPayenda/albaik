# Product images are framed 4:5 and never cropped

Every surface that shows a product image — the catalogue cards, the detail gallery and
its thumbnails, the dashboard previews and its tables — now uses one fixed 4:5 frame, and
the photograph is shown whole. A 1080×1350 upload therefore appears identically
everywhere: no cut, and no bars when the photo matches the frame.

The frame used to vary by surface. The card was a 16:10 landscape stage painted
`object-cover`, which cuts roughly half the height off a 4:5 photo; the detail stage was a
viewport-bounded box painted `object-contain`, which shows the whole photo but letterboxes
it depending on screen height; the thumbnails were square. Those shapes were deliberate —
the card's own comment reads "density is the point", sized so two tile rows clear a laptop
viewport. Standardising on 4:5 knowingly trades that density away: a portrait tile is
taller, so a product grid is now a page you scroll.

We accepted the trade because the alternative is cropping a product's own photograph on
the very surfaces whose job is to show the product. The rejected options: **keep the mixed
frames and crop to fill** — the status quo, which cuts a 4:5 photo roughly in half on a
card; **keep the frames and paint `object-contain` everywhere** — the whole photo, but bars
on every surface, which reads as unfinished; and a **per-surface mix**, 4:5 only where it
matters — rejected because inconsistency between surfaces is exactly what made the
catalogue look uneven.

Consequences worth remembering. The home and catalogue grids grow taller; the "density is
the point" note in the card is superseded, and the column counts were left unchanged
(4-up at `xl`) so the page does not grow further. Uploads are gated rather than merely
guided: the API upload route — mirrored by a pre-check in the admin field, including for
pasted URLs — accepts only exactly **1080×1350** and rejects every other size, so what an
editor stores is exactly what the frame shows; the rule is stated on the field as
"1080×1350 (4:5)". The seeded photography predates the rule and is left in place — three
`1400×933`, four `1128×1400`, one `1400×1400` — so those images show margins until they
are replaced. Only one stored file per image is generated (the pipeline preserves aspect
ratio, never upscales, and a 1080×1350 upload is under its 1600px longest-edge ceiling, so
the stored dimensions are 1080×1350 exactly); serving a card-sized derivative via
`srcset` is a known, deferred follow-up rather than part of this decision.
