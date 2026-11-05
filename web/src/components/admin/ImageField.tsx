import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { pushToast } from '@/store/uiSlice'
import { errorMessage } from '@/lib/api'
import {
  uploadImages,
  uploadErrorMessage,
  fileProductPhotoError,
  readImageSize,
  productPhotoSizeError,
  PRODUCT_PHOTO,
  type UploadKind,
} from '@/lib/upload'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

/**
 * An image field that accepts a file **or** a pasted URL.
 *
 * Why this exists: every image in the dashboard used to be a bare text box, so an editor
 * had to know a URL in advance. There is no way to choose a photo from the machine — or
 * from the camera roll on a phone, which is how most of this content will be captured.
 *
 * The file input is the thing that does the work: `accept="image/*"` opens the platform
 * picker on desktop and the photo library/camera sheet on mobile. It is visually hidden
 * and driven by its own `<label>`, because styling a file input directly is not reliable.
 * The URL box stays as a fallback for images that live somewhere else already.
 */
/**
 * The preview frames. Each one mirrors the shape the target surface paints, so the editor
 * sees the crop rather than a generic box: a hero composition uploaded into the wrong
 * breakpoint reads as wrong immediately.
 */
const ASPECT_FRAME: Record<'video' | 'square' | 'ultrawide' | 'tablet' | 'portrait', string> = {
  video: 'aspect-video',
  square: 'aspect-square max-w-[10rem]',
  ultrawide: 'aspect-[236/100]',
  tablet: 'aspect-[4/3] max-w-[16rem]',
  portrait: 'aspect-[3/4] max-w-[10rem]',
}

export function ImageField({
  id,
  value,
  onChange,
  placeholder = '/uploads/… or https://…',
  aspect = 'video',
  kind = 'product',
  disabled,
}: {
  id?: string
  value: string
  onChange: (url: string) => void
  placeholder?: string
  /** The preview frame. `video` suits banners and hero artwork; `square` suits logos. */
  aspect?: 'video' | 'square' | 'ultrawide' | 'tablet' | 'portrait'
  /** `product-photo` enforces exactly 1080×1350; `backdrop-*` routes to a breakpoint. */
  kind?: UploadKind
  disabled?: boolean
}) {
  const dispatch = useAppDispatch()
  const [busy, setBusy] = useState(false)
  const [urlError, setUrlError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const productPhoto = kind === 'product-photo'

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const chosen = Array.from(files)
      // A product photograph is checked before it is uploaded, so the editor gets the
      // message straight away rather than from a rejected request.
      if (productPhoto) {
        const problem = await fileProductPhotoError(chosen[0])
        if (problem) {
          dispatch(pushToast({ tone: 'error', title: 'Wrong image size', description: problem }))
          return
        }
      }
      const [first] = await uploadImages(chosen, kind)
      onChange(first.url)
      setUrlError('')
      dispatch(pushToast({ tone: 'success', title: 'Image uploaded' }))
    } catch (error) {
      dispatch(
        pushToast({
          tone: 'error',
          title: 'Upload failed',
          description: uploadErrorMessage(error),
        }),
      )
    } finally {
      setBusy(false)
      // Clearing the input lets the same file be picked again after a "Remove".
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  /** Flag a pasted URL that is not a 1080×1350 product photograph (checked on blur). */
  const checkUrl = async (url: string) => {
    if (!productPhoto || !url.trim()) {
      setUrlError('')
      return
    }
    try {
      const { width, height } = await readImageSize(url)
      setUrlError(productPhotoSizeError(width, height) ?? '')
    } catch {
      // Cross-origin or unreachable — the dimensions cannot be read, so do not flag it.
      setUrlError('')
    }
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-outline-variant bg-surface-container-low',
          productPhoto
            ? 'aspect-[4/5] max-w-[10rem]'
            : ASPECT_FRAME[aspect],
        )}
      >
        {value ? (
          <img
            src={value}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn('size-full', productPhoto || aspect === 'square' ? 'object-contain' : 'object-cover')}
          />
        ) : (
          <span className="flex flex-col items-center gap-1 px-space-sm text-center">
            <Upload size={20} className="text-on-surface-variant" />
            <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
              No image selected
            </span>
          </span>
        )}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-gradient-midnight/60 text-label-md font-semibold text-white">
            Uploading…
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-space-sm">
        <label
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary-container/20 bg-clinical-white px-3.5 py-2 text-label-md font-semibold text-primary-container transition-colors hover:bg-water-foam',
            (busy || disabled) && 'pointer-events-none opacity-60',
          )}
        >
          <Upload size={15} />
          {busy ? 'Uploading…' : 'Choose image'}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(event) => void pick(event.target.files)}
          />
        </label>

        {value ? (
          <Button variant="ghost" icon="delete" onClick={() => onChange('')}>
            Remove
          </Button>
        ) : null}
      </div>

      <TextInput
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          if (urlError) setUrlError('')
        }}
        onBlur={(event) => void checkUrl(event.target.value)}
        placeholder={placeholder}
        aria-label="Image URL"
      />

      {urlError ? (
        <p className="text-label-sm text-error">{urlError}</p>
      ) : productPhoto ? (
        <p className="text-label-sm text-on-surface-variant">
          Required: exactly {PRODUCT_PHOTO.width}×{PRODUCT_PHOTO.height} (4:5).
        </p>
      ) : null}
    </div>
  )
}

/**
 * Multi-image picker used for the product gallery.
 *
 * Appends rather than replaces: a gallery is built up one upload at a time, and wiping
 * the existing images on every pick would be surprising. Every image here is a product
 * photograph, so it goes through the route that requires exactly 1080×1350.
 */
export function ImageGalleryField({
  onAdd,
  busy,
  disabled,
}: {
  onAdd: (urls: string[]) => void
  busy?: boolean
  disabled?: boolean
}) {
  const dispatch = useAppDispatch()
  const [working, setWorking] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploading = busy || working

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setWorking(true)
    try {
      const uploaded = await uploadImages(Array.from(files), 'product-photo')
      onAdd(uploaded.map((item) => item.url))
      dispatch(pushToast({ tone: 'success', title: `${uploaded.length} image(s) uploaded` }))
    } catch (error) {
      dispatch(
        pushToast({
          tone: 'error',
          title: 'Upload failed',
          description: errorMessage(error),
        }),
      )
    } finally {
      setWorking(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary-container/20 bg-clinical-white px-3.5 py-2 text-label-md font-semibold text-primary-container transition-colors hover:bg-water-foam',
        (uploading || disabled) && 'pointer-events-none opacity-60',
      )}
    >
      <Upload size={15} />
      {uploading ? 'Uploading…' : 'Add images'}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => void pick(event.target.files)}
      />
    </label>
  )
}
