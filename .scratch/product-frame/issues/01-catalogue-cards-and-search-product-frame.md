# 01 — Catalogue cards and search show the whole photo in the Product frame

**What to build:** A visitor browsing a collection, a category, the home "Signature Formulations" row, "Related formulations", or the search overlay sees each product image whole, inside a 4:5 Product frame — never cropped. This establishes the never-crop default on the shared product-image component, so the policy holds for every surface from here on.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every product card (collection, category, home "Signature Formulations", "Related formulations") shows the product image whole inside a 4:5 Product frame — no cropping.
- [ ] A correctly prepared 1080×1350 photo fills the frame edge to edge; an off-ratio photo is shown whole with margins rather than cropped.
- [ ] The card's loading skeleton matches the 4:5 frame.
- [ ] The search overlay's product thumbnails use the same 4:5 Product frame.
- [ ] Product images are never cropped by default (the shared product-image component fits the photo whole).
- [ ] The card's "density is the point" note is replaced with copy describing the taller portrait card.
