import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { pushToast } from '@/store/uiSlice'
import { errorMessage } from '@/lib/api'
import { uploadImages, uploadErrorMessage, type UploadKind } from '@/lib/upload'
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
  /** `video` suits banners and hero artwork; `square` suits logos and icons. */
  aspect?: 'video' | 'square'
  /** `backdrop` routes to the hero upload with hero-sized ceilings. */
  kind?: UploadKind
  disabled?: boolean
}) {
  const dispatch = useAppDispatch()
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const [first] = await uploadImages(Array.from(files), kind)
      onChange(first.url)
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

  return (
    <div className="flex flex-col gap-space-sm">
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-outline-variant bg-surface-container-low',
          aspect === 'video' ? 'aspect-video' : 'aspect-square max-w-[10rem]',
        )}
      >
        {value ? (
          <img
            src={value}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn('size-full', aspect === 'square' ? 'object-contain' : 'object-cover')}
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Image URL"
      />
    </div>
  )
}

/**
 * Multi-image picker used for the product gallery.
 *
 * Appends rather than replaces: a gallery is built up one upload at a time, and wiping
 * the existing images on every pick would be surprising.
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
      const uploaded = await uploadImages(Array.from(files))
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
