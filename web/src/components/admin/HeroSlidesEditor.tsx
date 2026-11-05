import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { saveResource } from '@/store/adminSlice'
import { pushToast } from '@/store/uiSlice'
import { AdminCard } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { ImageField } from '@/components/admin/ImageField'
import { Icon } from '@/components/ui/Icon'
import {
  HERO_VARIANTS,
  parseSlides,
  type FocalPoint,
  type HeroSlide,
  type HeroVariant,
} from '@/lib/heroSlides'
import type { UploadKind } from '@/lib/upload'

const TEMPLATE: HeroSlide = {
  backdrop: '',
  backdrops: {},
  focalPoint: 'away-from-text',
  title: '',
  accentWord: '',
  body: '',
  primaryCtaLabel: '',
  primaryCtaHref: '',
  secondaryCtaLabel: '',
  secondaryCtaHref: '',
}

/**
 * The four art-directed compositions, in the order the hero asks for them.
 *
 * Each label carries the breakpoint and the shape so an editor can match a file to a
 * slot without reading the CSS, and each `kind` routes the upload to that breakpoint's
 * ceiling — a phone never downloads a 2560px file. The hero renders them as
 * `<source media>` entries, so the browser picks exactly one.
 */
const VARIANT_FIELDS: {
  variant: HeroVariant
  label: string
  hint: string
  aspect: 'ultrawide' | 'video' | 'tablet' | 'portrait'
  kind: UploadKind
}[] = [
  {
    variant: 'ultrawide',
    label: 'Ultrawide · 1600px and up',
    hint: '2560×1086, about 2.36:1. The widest composition.',
    aspect: 'ultrawide',
    kind: 'backdrop-ultrawide',
  },
  {
    variant: 'desktop',
    label: 'Desktop · 1024–1599px',
    hint: '1920×1080, 16:9.',
    aspect: 'video',
    kind: 'backdrop-desktop',
  },
  {
    variant: 'tablet',
    label: 'Tablet · 768–1023px',
    hint: '1536×1153, 4:3.',
    aspect: 'tablet',
    kind: 'backdrop-tablet',
  },
  {
    variant: 'mobile',
    label: 'Mobile · under 768px',
    hint: '1080×1441, 3:4 portrait.',
    aspect: 'portrait',
    kind: 'backdrop-mobile',
  },
]

/** Drops empty slots so "unset" stays unambiguous and the JSON stays small. */
function cleanBackdrops(value?: Partial<Record<HeroVariant, string>>) {
  return Object.fromEntries(
    HERO_VARIANTS.flatMap((variant) => {
      const url = value?.[variant]?.trim()
      return url ? [[variant, url] as const] : []
    }),
  )
}

/**
 * The three crop biases, labelled by where the subject sits relative to the copy. They
 * are compositions rather than measurements, which is why there are three of them and
 * not a percentage — and why the labels are written against the text rather than
 * against "left", which would be wrong in the Dari and Pashto editions.
 */
const FOCAL_OPTIONS: { value: FocalPoint; label: string }[] = [
  { value: 'away-from-text', label: 'Away from the text' },
  { value: 'centre', label: 'Centred' },
  { value: 'toward-text', label: 'Toward the text' },
]

/**
 * Edits the hero carousel slides.
 *
 * The slides live on the hero `HomeSection` as `SlidesJson`. Because the admin PUT
 * for home sections replaces the whole row, the save payload is built from the current
 * section fields plus only the new `slidesJson` — so editing slides can never blank the
 * eyebrow, heading or anything else on the hero.
 *
 * Each slide owns its backdrop. A slide with none falls back to the hero's default
 * backdrop and then to the royal gradient, which is why the default is optional rather
 * than required. See docs/adr/0001-hero-backdrop-per-slide.md.
 *
 * This sits above the generic section table on the Home page screen; the table still
 * owns the hero's single-card fields (heading, body, both CTAs), which act as the
 * fallback when no slides are set.
 */
export function HeroSlidesEditor() {
  const dispatch = useAppDispatch()
  const sections = useAppSelector((state) => state.admin.homeSections.items) as {
    id: number
    key: string
    sectionType: string
    eyebrow?: string
    title?: string
    subtitle?: string
    body?: string
    imageUrl?: string
    primaryCtaLabel?: string
    primaryCtaHref?: string
    secondaryCtaLabel?: string
    secondaryCtaHref?: string
    dataJson?: string
    slidesJson?: string | null
    sortOrder: number
    isVisible: boolean
  }[]
  const saving = useAppSelector((state) => state.admin.homeSections.status) === 'loading'

  const hero = useMemo(() => sections.find((s) => s.key === 'hero'), [sections])

  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [defaultBackdrop, setDefaultBackdrop] = useState('')
  const [defaultBackdrops, setDefaultBackdrops] = useState<Partial<Record<HeroVariant, string>>>({})
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (seeded || !hero) return
    setSlides(parseSlides(hero.slidesJson).length ? parseSlides(hero.slidesJson) : [TEMPLATE])
    try {
      const data = JSON.parse(hero.dataJson ?? '{}') as {
        defaultBackdrop?: string
        defaultBackdrops?: Partial<Record<HeroVariant, string>>
      }
      setDefaultBackdrop(data.defaultBackdrop ?? '')
      setDefaultBackdrops(data.defaultBackdrops ?? {})
    } catch {
      setDefaultBackdrop('')
      setDefaultBackdrops({})
    }
    setSeeded(true)
  }, [hero, seeded])

  if (!hero) {
    return (
      <AdminCard>
        <p className="text-body-sm text-on-surface-variant">Loading hero section…</p>
      </AdminCard>
    )
  }

  const set = (index: number, patch: Partial<HeroSlide>) =>
    setSlides((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  const setBackdrop = (index: number, variant: HeroVariant, url: string) =>
    setSlides((current) =>
      current.map((s, i) =>
        i === index ? { ...s, backdrops: { ...s.backdrops, [variant]: url } } : s,
      ),
    )
  const setDefaultVariant = (variant: HeroVariant, url: string) =>
    setDefaultBackdrops((current) => ({ ...current, [variant]: url }))
  const move = (index: number, dir: -1 | 1) =>
    setSlides((current) => {
      const next = [...current]
      const target = index + dir
      if (target < 0 || target >= next.length) return next
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  const remove = (index: number) => setSlides((current) => current.filter((_, i) => i !== index))

  const onSave = async () => {
    const clean = slides.map((s) => ({
      backdrop: s.backdrop ?? '',
      backdrops: cleanBackdrops(s.backdrops),
      focalPoint: s.focalPoint ?? 'away-from-text',
      title: s.title ?? '',
      accentWord: s.accentWord ?? '',
      body: s.body ?? '',
      primaryCtaLabel: s.primaryCtaLabel ?? '',
      primaryCtaHref: s.primaryCtaHref ?? '',
      secondaryCtaLabel: s.secondaryCtaLabel ?? '',
      secondaryCtaHref: s.secondaryCtaHref ?? '',
    }))
    const existingData = (() => {
      try { return JSON.parse(hero.dataJson ?? '{}') } catch { return {} }
    })() as Record<string, unknown>
    const payload = {
      key: hero.key,
      sectionType: hero.sectionType,
      eyebrow: hero.eyebrow ?? '',
      title: hero.title ?? '',
      subtitle: hero.subtitle ?? '',
      body: hero.body ?? '',
      imageUrl: hero.imageUrl ?? '',
      primaryCtaLabel: hero.primaryCtaLabel ?? '',
      primaryCtaHref: hero.primaryCtaHref ?? '',
      secondaryCtaLabel: hero.secondaryCtaLabel ?? '',
      secondaryCtaHref: hero.secondaryCtaHref ?? '',
      dataJson: JSON.stringify({
        ...existingData,
        defaultBackdrop,
        defaultBackdrops: cleanBackdrops(defaultBackdrops),
      }),
      slidesJson: JSON.stringify(clean),
      sortOrder: hero.sortOrder,
      isVisible: hero.isVisible,
    }
    const result = await dispatch(
      saveResource({ resource: 'homeSections', id: hero.id, payload, refresh: true }),
    )
    if (saveResource.fulfilled.match(result)) {
      setSeeded(false)
      dispatch(pushToast({ tone: 'success', title: 'Hero slides saved' }))
    } else {
      dispatch(pushToast({ tone: 'error', title: 'Could not save the hero slides' }))
    }
  }

  return (
    <AdminCard
      title="Hero carousel"
      description="Each slide carries up to four art-directed compositions — ultrawide, desktop, tablet and mobile — and the browser loads exactly the one its screen needs. Every upload is converted to WebP under 300 KB. Plus the headline (title + accent word), body and two buttons. With one slide the hero behaves like the original single banner."
      actions={
        <>
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setSlides((c) => [...c, { ...TEMPLATE }])}>
            Add slide
          </Button>
          <Button variant="primary" size="sm" icon="save" loading={saving} onClick={onSave}>
            Save slides
          </Button>
        </>
      }
    >
      <p className="mb-space-md text-label-md text-on-surface-variant">
        {slides.length} slide{slides.length === 1 ? '' : 's'} · the first slide is what visitors see on load.
      </p>

      <div className="flex flex-col gap-space-md">
        {slides.map((slide, index) => (
          <div
            key={index}
            className="relative grid gap-space-sm rounded-xl border border-primary-container/15 bg-surface-container-lowest p-space-md sm:grid-cols-2"
          >
            <div className="absolute right-3 top-3 flex items-center gap-1">
              <button
                type="button"
                aria-label="Move slide up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="grid size-8 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
              >
                <Icon name="arrow_upward" size={16} />
              </button>
              <button
                type="button"
                aria-label="Move slide down"
                disabled={index === slides.length - 1}
                onClick={() => move(index, 1)}
                className="grid size-8 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
              >
                <Icon name="arrow_downward" size={16} />
              </button>
              <button
                type="button"
                aria-label="Delete slide"
                onClick={() => remove(index)}
                className="grid size-8 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
              >
                <Icon name="delete" size={16} />
              </button>
            </div>

            <span className="row-span-2 hidden items-center justify-center rounded-lg bg-royal-gradient text-headline-lg font-bold text-white sm:flex">
              {index + 1}
            </span>

            <div className="grid gap-space-sm sm:col-span-2 sm:grid-cols-2">
              {VARIANT_FIELDS.map((field) => (
                <Field key={field.variant} label={field.label} hint={field.hint}>
                  <ImageField
                    id={`slide-${index}-${field.variant}`}
                    value={slide.backdrops?.[field.variant] ?? ''}
                    onChange={(v) => setBackdrop(index, field.variant, v)}
                    aspect={field.aspect}
                    kind={field.kind}
                    placeholder="Paste an image URL or upload"
                  />
                </Field>
              ))}
              <Field
                label="Focal point"
                hint="Which part of the backdrop the crop keeps. Whichever way you choose, the copy stays clear of the subject."
              >
                <Select
                  id={`slide-${index}-focal`}
                  value={slide.focalPoint ?? 'away-from-text'}
                  onChange={(e) => set(index, { focalPoint: e.target.value as FocalPoint })}
                >
                  {FOCAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Fallback for any size (optional)"
                hint="A single picture used at any breakpoint with no composition of its own — including slides saved before per-size artwork existed."
              >
                <ImageField
                  id={`slide-${index}-backdrop`}
                  value={slide.backdrop ?? ''}
                  onChange={(v) => set(index, { backdrop: v })}
                  aspect="video"
                  kind="backdrop"
                  placeholder="Paste an image URL or upload"
                />
              </Field>
            </div>

            <Field label="Headline (title)">
              <TextInput
                id={`slide-${index}-title`}
                value={slide.title ?? ''}
                onChange={(e) => set(index, { title: e.target.value })}
                placeholder="The Mark of"
              />
            </Field>
            <Field label="Accent word" hint="The italic gold word — e.g. “Pure Perfection.”">
              <TextInput
                id={`slide-${index}-accent`}
                value={slide.accentWord ?? ''}
                onChange={(e) => set(index, { accentWord: e.target.value })}
                placeholder="Pure Perfection."
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Body copy">
                <TextArea
                  id={`slide-${index}-body`}
                  rows={3}
                  value={slide.body ?? ''}
                  onChange={(e) => set(index, { body: e.target.value })}
                  placeholder="A sentence or two of supporting copy."
                />
              </Field>
            </div>
            <Field label="Primary button label">
              <TextInput
                id={`slide-${index}-pLabel`}
                value={slide.primaryCtaLabel ?? ''}
                onChange={(e) => set(index, { primaryCtaLabel: e.target.value })}
                placeholder="Explore the Collections"
              />
            </Field>
            <Field label="Primary button link">
              <TextInput
                id={`slide-${index}-pHref`}
                value={slide.primaryCtaHref ?? ''}
                onChange={(e) => set(index, { primaryCtaHref: e.target.value })}
                placeholder="/collections"
              />
            </Field>
            <Field label="Secondary button label">
              <TextInput
                id={`slide-${index}-sLabel`}
                value={slide.secondaryCtaLabel ?? ''}
                onChange={(e) => set(index, { secondaryCtaLabel: e.target.value })}
                placeholder="Our Product Approach"
              />
            </Field>
            <Field label="Secondary button link">
              <TextInput
                id={`slide-${index}-sHref`}
                value={slide.secondaryCtaHref ?? ''}
                onChange={(e) => set(index, { secondaryCtaHref: e.target.value })}
                placeholder="/about"
              />
            </Field>
          </div>
        ))}
      </div>

      <div className="mt-space-lg border-t border-primary-container/10 pt-space-md">
        <p className="mb-space-sm text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
          Default artwork
        </p>
        <p className="mb-space-md text-label-md text-on-surface-variant">
          Inherited by any slide with no picture of its own, so a half-built carousel still
          looks finished. Leave it empty and those slides fall back to the royal gradient.
        </p>
        <div className="grid gap-space-sm sm:grid-cols-2">
          {VARIANT_FIELDS.map((field) => (
            <Field key={field.variant} label={field.label} hint={field.hint}>
              <ImageField
                id={`hero-default-${field.variant}`}
                value={defaultBackdrops[field.variant] ?? ''}
                onChange={(v) => setDefaultVariant(field.variant, v)}
                aspect={field.aspect}
                kind={field.kind}
                placeholder="Paste an image URL or upload"
              />
            </Field>
          ))}
          <Field
            label="Fallback for any size (optional)"
            hint="Used at any breakpoint with no composition of its own."
          >
            <ImageField
              id="hero-default-backdrop"
              value={defaultBackdrop}
              onChange={setDefaultBackdrop}
              aspect="video"
              kind="backdrop"
              placeholder="Paste an image URL or upload"
            />
          </Field>
        </div>
      </div>
    </AdminCard>
  )
}
