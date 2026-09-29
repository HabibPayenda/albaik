import { api, endpoints, errorMessage } from './api'

export interface UploadedImage {
  url: string
}

/**
 * Which upload route an image goes to.
 *
 * - `product` — the general catalogue route (300 KB, 1600px longest edge): collection,
 *   brand and section artwork.
 * - `product-photo` — a product photograph, which the route accepts only at exactly
 *   1080×1350 (see docs/adr/0006-product-images-are-framed-4-5.md).
 * - `backdrop` — the hero ceilings, because a backdrop is displayed at viewport width and
 *   the product limits are sized for a card.
 */
export type UploadKind = 'product' | 'product-photo' | 'backdrop'

function uploadEndpoint(kind: UploadKind): string {
  if (kind === 'backdrop') return endpoints.admin.backdropUpload
  if (kind === 'product-photo') return endpoints.admin.productUpload
  return endpoints.admin.upload
}

/** The one accepted product-image size — 4:5, matching the Product frame. */
export const PRODUCT_PHOTO = { width: 1080, height: 1350 } as const

/** Read an image's natural pixel size from a URL or object URL. */
export function readImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('The image could not be loaded.'))
    image.src = src
  })
}

/** Message for an image that is not exactly the product-photo size, or null when it is. */
export function productPhotoSizeError(width: number, height: number): string | null {
  if (width === PRODUCT_PHOTO.width && height === PRODUCT_PHOTO.height) return null
  return `Product images must be exactly ${PRODUCT_PHOTO.width}×${PRODUCT_PHOTO.height} (4:5). This one is ${width}×${height}.`
}

/** Check a chosen file's dimensions before it is uploaded. */
export async function fileProductPhotoError(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const { width, height } = await readImageSize(url)
    return productPhotoSizeError(width, height)
  } catch {
    return 'That file could not be read as an image.'
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Uploads files to the admin upload route for `kind` and returns their public URLs.
 *
 * Extracted because the product editor had this loop embedded in a component, which
 * meant every other image field in the dashboard (categories, brands, home sections)
 * had no way to upload at all — they were raw URL text inputs. The server transcodes
 * every raster upload to WebP and caps it, so the URL that comes back is already the
 * right one to store.
 *
 * Files are sent one at a time rather than in a single multipart body: the endpoint
 * takes a single `file`, and one request per file keeps the error reporting honest
 * about which file failed.
 *
 * No `Content-Type` is set on these requests. The boundary is part of the multipart
 * serialisation and belongs to whoever builds the body; declaring
 * `multipart/form-data` by hand sends no boundary, and the API rejects the body with
 * 415 before the route runs.
 */
export async function uploadImages(files: File[], kind: UploadKind = 'product'): Promise<UploadedImage[]> {
  const uploaded: UploadedImage[] = []
  const url = uploadEndpoint(kind)
  for (const file of files) {
    const body = new FormData()
    body.append('file', file)
    const { data } = await api.post<UploadedImage>(url, body)
    uploaded.push(data)
  }
  return uploaded
}

/** User-facing message for a failed upload. */
export function uploadErrorMessage(error: unknown): string {
  return errorMessage(error, 'The image could not be uploaded. Please try again.')
}
