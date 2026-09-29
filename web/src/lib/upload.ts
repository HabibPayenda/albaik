import { api, endpoints, errorMessage } from './api'

export interface UploadedImage {
  url: string
}

/**
 * Which upload route an image goes to. `product` uses the catalogue ceilings (300 KB,
 * 1600px longest edge); `backdrop` uses the hero ceilings, because a backdrop is
 * displayed at viewport width and the product limits are sized for a card.
 */
export type UploadKind = 'product' | 'backdrop'

function uploadEndpoint(kind: UploadKind): string {
  return kind === 'backdrop' ? endpoints.admin.backdropUpload : endpoints.admin.upload
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
