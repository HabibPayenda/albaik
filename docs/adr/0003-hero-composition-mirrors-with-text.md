# The hero picture is complete, never cropped, and the scrim mirrors with the text

The home hero's picture is a real `<img>` painted with `object-contain`, so the
whole frame is on screen at every viewport. It is deliberately **not**
`object-cover`. Cover was the earlier choice and it is wrong: it discarded 24.8% of
the frame at 1440×812 and 78.8% at 390×780, and at that width it cut ~24% into the
subject itself. Contain costs a letterbox bar instead, and the section's own royal
gradient fills it, so a picture whose proportions differ from the hero reads as a
framed band rather than a crop.

Being a real element rather than a CSS background is the point, not an
implementation detail. As a background it had no `alt` text, was invisible to search
engines, and could not be discovered by the preload scanner — so it could not be the
LCP element it actually is. As an `<img>` it carries `alt`, `fetchpriority="high"`
and an intrinsic size.

## What contain costs, measured

The bar is not a constant; it is whatever the viewport's proportions demand, so it
has to be measured rather than assumed
(`.workbuddy-ai/scripts/measure-hero-picture.js`):

| viewport | hero box | picture painted | bar | picture share |
| --- | --- | --- | --- | --- |
| 390×780 | 492×835 | 492×209 | 627px | 25.0% |
| 768×1024 | 765×795 | 765×325 | 471px | 40.8% |
| 1024×700 | 1026×873 | 1026×435 | 438px | 49.9% |
| 1440×812 | 1450×828 | 1450×615 | 213px | 74.3% |
| 1920×1080 | 1940×828 | 1940×823 | 5px | 99.4% |

At 1920 the hero is almost exactly the picture's proportions and the layout is
effectively seamless. On a portrait phone the picture is as large as it can be
without cropping — full width, 209px — and the copy owns the rest. That is inherent
to a 2.357:1 picture in a portrait box, not a defect, and the only way to make the
picture taller on a phone is to crop it, which is the thing being rejected.

## The scrim still mirrors, and why it got stronger

The scrim's axis remains relative to the text, stored logically and flipped under one
RTL rule, so the dark side always sits under the copy. Storing the focal point as one
of three positions rather than a free percentage is still deliberate: these are
compositions, and a number means nothing until it is rendered.

`FOCAL_POSITION` maps to Tailwind's `object-*` utilities, **not** the `bg-*` ones.
The picture is an element now, and `bg-right` styles a `background-position`, so the
`bg-*` classes silently did nothing. Under `contain` the horizontal value is usually a
no-op — the picture is far wider than the hero is tall, so it is constrained by width
and has no horizontal slack to bias. It earns its keep in the opposite regime, a very
wide and short viewport, where the picture is constrained by height instead.

Legibility comes from the scrim, never from the picture, on the same reasoning the
removed product plate used: an image a human uploads cannot be a property that
legibility depends on. The stops had to get **stronger** than the cropped version's
`/95 /80 /60`, and the reason is the change above. With cover, RTL copy sampled source
x≈1199 — the empty dark margin — so a moderate scrim sufficed. With the whole frame
on screen, RTL copy at x=897 maps to source x≈1594, which is on the subject. The copy
now genuinely overlaps the subject, so the text side needed more cover. That is the
measured cost of showing the complete picture with the copy over it.

## Measured

`from-[#050d24]/97 via-[#050d24]/88 to-[#0e3b9c]/72` holds 4.5:1 everywhere, on
rendered pixels rather than on the stylesheet
(`.workbuddy-ai/scripts/verify-hero.mjs`, sampling the text rectangles taken from
the live DOM — a fixed patch grid finds the gold CTA's own fill and reports it as
1.11:1 text):

| case | worst run | median | worst element |
| --- | --- | --- | --- |
| LTR, real banner | 6.37:1 | 8.69:1 | slide badge |
| RTL, real banner | 5.26:1 | 8.51:1 | stat label |
| near-white backdrop | 5.54:1 | 8.36:1 | stat label |
| label inside a control | 9.73:1 | — | stat label |

The cropped version's `/95 /80 /60` fails here at 4.45:1 in RTL — reproduced, not
predicted — which is the measurement that forced the increase. The near-white case is
the closest to the floor at 5.54:1.

Re-run `verify-hero.mjs` after any change to these three stops, the copy width, or
the orbs, and re-run `measure-hero-picture.js` after any change that alters the hero's
height or the picture's proportions.
