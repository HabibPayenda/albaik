# Backdrops get their own upload route and their own size ceiling

Every raster upload passes through one generic `POST /api/admin/upload`, which
transcodes to WebP under a 300 KB byte ceiling and a 1600px longest edge. Both
numbers were sized for a product card — the pipeline's own comments say "every
product image" and "comfortably above any retina card" — so reusing them for a
full-bleed hero is a category error that ships a soft backdrop. Backdrops instead
get a separate route with its own dimension and byte ceilings, storing under
`uploads/backdrops/`.

This was chosen over a `?purpose=backdrop` parameter on the existing route
because that endpoint's documented contract is *unconditional* — "every raster
upload is guaranteed to come back at or under 300 KB". Making the guarantee
depend on a caller-supplied string means it holds only for callers that pass the
right argument, and the caller that forgets gets an oversized file with no error.
The separate route keeps the product guarantee absolute in its own place.

Note for a future reader tempted to unify the two: the ceilings differ on
purpose. Do not "simplify" them back to one. Also, `uploads/backdrops/` sits
under `/uploads/` deliberately, so the existing `albaik-media` runtime cache rule
already covers uploaded backdrops with no PWA configuration change.

The ceilings are `ImagePipeline.Limits.Backdrop` and `ImagePipeline.Limits.Product`
— separate constants, not one number used twice, so the product guarantee stays
provable on its own. `ExceedsCeiling` takes the ceiling as an argument for the
same reason. Verified by `.workbuddy-ai/scripts/verify-backdrop-upload.mjs`, which
also pins the rejections (non-image 400, unauthenticated 401, missing file 400).

One thing that cost real time and is worth recording: the client must **not** set
`Content-Type` on these requests. Declaring `multipart/form-data` by hand sends no
boundary, and the API answers 415 before the route is ever reached — which reads
like a broken route rather than a broken header. The uploads folder was empty
because of it. The boundary belongs to the serialiser.
