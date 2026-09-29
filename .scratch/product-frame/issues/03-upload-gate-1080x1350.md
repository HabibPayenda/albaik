# 03 — Product images can only be added at exactly 1080×1350; the dashboard shows the Product frame

**What to build:** Staff cannot add a wrongly-sized product image. The upload route accepts only exactly 1080×1350 and rejects every other size with a clear message; the upload field states the requirement and checks both chosen files and pasted URLs before saving; and the dashboard's image previews render the same 4:5, uncropped Product frame as the site.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The upload route accepts an exactly 1080×1350 image and rejects every other size with a message that names the required size.
- [ ] An API test covers both the accept and the reject at the upload seam.
- [ ] The upload field states "1080×1350 (4:5)" as a requirement and flags a wrong-sized chosen file before it is uploaded.
- [ ] A pasted image URL that is not 1080×1350 is flagged in the field.
- [ ] The upload preview, the product editor preview and the products table show the 4:5, uncropped Product frame.
