# The verification code is a stored random token, not a signature derived from the product

Each product carries a QR code that opens a page saying the product is genuine.
The token inside that QR could have been produced two ways:

1. **Derived** — an HMAC over the product's identity and a server secret,
   recomputed whenever a QR is requested. Nothing extra is stored, and the code
   is reproducible from the product.
2. **Stored** — a random token minted once, saved on the product, and read back
   when the QR is generated.

We chose **stored**.

## Why

The derived version looks cheaper until the secret changes. A secret that is
only ever read from configuration still has to be rotated eventually — it can
leak, a person who knew it can leave, a hosting migration can drop it. The moment
it does, every HMAC changes and **every QR code already printed on packaging
stops verifying**. That is a recall of the whole catalogue's labels, not a
configuration change. A stored token survives any secret rotation because there
is no secret to rotate.

Stored also matches the one operation the business actually needs: replacing a
single product's code when a token is abused. With a stored token that is one
row; with a signature it is a key change that breaks every other product too.

The cost is honest and small: the token is data, so it lives in the database
backup and must not be lost, and a new product needs a code minted at creation
(existing rows are backfilled at startup).

## What a per-product code can and cannot prove

The QR is identical on every unit of a product. Someone can photograph one
genuine bottle and print that code on a thousand fakes, and all of them will show
the genuine page. So the claim is "this product is in Albaik's catalogue", not
"this unit came from the factory". The verification page is worded for that:
*This is a genuine Albaik product*, plus the name and image, so a mismatch is
visible at a glance.

Proving a unit rather than a product line needs a serial per unit, minted where
the packaging is printed. That is a different project, and the verification page
is already shaped for it: the token is just a lookup key.

## The mark in the middle

The QR carries the Albaik crown on a white plate in its centre. A bare code on packaging
reads as a generic barcode; the crown is what says "this is Albaik's own label" at arm's
length, and it makes a copied code look wrong to a customer who knows the product.

That costs error-correction headroom, so the code is generated at **ECC level H** (~30%
recovery) and the plate covers about a fifth of the width — comfortably inside what H
tolerates. It was verified by decoding the rendered PNG, mark included, back to the exact
verification URL.

The mark ships with the API (`Assets/crown-navy.webp`, the brand kit's WebP) and is
transcoded to PNG once, because not every SVG renderer or print tool understands WebP
inside an `<image>`. If the asset is missing the code still renders, without the mark —
printing must never fail because a decorative file moved.

## Consequences worth remembering

- Only **published** products verify. A retired product's QR shows the
  "could not verify" page rather than claiming a product you have pulled is
  genuine.
- Replacing a code requires the admin's password, because it silently invalidates
  printed labels.
- The QR encodes an absolute URL, so the site's public origin comes from the
  `site.publicBaseUrl` setting with the request host as a fallback. A QR generated
  from a laptop without that setting encodes `localhost` and is useless once
  printed.
- The IBN is deliberately not part of the QR. It is a human-readable product
  number, guessable by design, and putting it in the QR would let anyone type it
  into the verification URL.
