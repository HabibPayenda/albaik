import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { GripVertical, Trash2 } from 'lucide-react'
import { api, endpoints, errorMessage } from '@/lib/api'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadBrands, loadCategories } from '@/store/adminSlice'
import { pushToast } from '@/store/uiSlice'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { AdminCard, AdminPageHeader } from '@/components/admin/AdminUI'
import { ImageField, ImageGalleryField } from '@/components/admin/ImageField'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Field, Select, TagInput, TextArea, TextInput, Toggle } from '@/components/ui/Field'
import { ProductImage } from '@/components/ui/ProductImage'
import { Icon } from '@/components/ui/Icon'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'
import type { Brand, Category, ProductDetail, ProductInput } from '@/lib/types'

const EMPTY: ProductInput = {
  name: '',
  slug: '',
  categoryId: 0,
  brandId: 0,
  subtitle: '',
  formulationLabel: '',
  shortDescription: '',
  description: '',
  size: '',
  price: null,
  compareAtPrice: null,
  // Left empty on purpose: a product with no currency of its own follows the default
  // configured in Settings, which the editor resolves both when it renders and when it
  // saves — so the setting reaches the field even when the settings map arrives late.
  currency: '',
  priceNote: '',
  rating: null,
  reviewCount: 0,
  badge: '',
  badgeStyle: 'primary',
  stockStatus: 'InStock',
  imageUrl: '',
  accentFrom: '#050d24',
  accentTo: '#0e3b9c',
  benefits: [],
  ingredients: [],
  howToUse: '',
  safetyNote: '',
  suitableFor: '',
  isFeatured: false,
  isActive: true,
  sortOrder: 0,
  images: [],
}

const SECTIONS = [
  { key: 'basics', label: 'Basics', icon: 'product' },
  { key: 'pricing', label: 'Pricing', icon: 'analytics' },
  { key: 'copy', label: 'Description', icon: 'page' },
  { key: 'benefits', label: 'Benefits & ingredients', icon: 'check_circle' },
  { key: 'media', label: 'Media', icon: 'image' },
] as const

export default function ProductEditorPage() {
  const { productId } = useParams()
  const isNew = !productId || productId === 'new'
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const settings = useSiteSettings()

  // The admin slice stores collections as `unknown[]`; narrow at the point of use.
  const categories = useAppSelector((state) => state.admin.categories.items) as Category[]
  const brands = useAppSelector((state) => state.admin.brands.items) as Brand[]

  const [form, setForm] = useState<ProductInput>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [section, setSection] = useState<(typeof SECTIONS)[number]['key']>('basics')

  useEffect(() => {
    if (!categories.length) dispatch(loadCategories())
    if (!brands.length) dispatch(loadBrands())
  }, [categories.length, brands.length, dispatch])

  // Load the existing product when editing.
  useEffect(() => {
    if (isNew) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .get<ProductDetail>(endpoints.admin.product(Number(productId)))
      .then(({ data }) => {
        if (cancelled) return
        setForm({
          name: data.name,
          slug: data.slug,
          categoryId: data.categoryId,
          brandId: data.brandId,
          subtitle: data.subtitle ?? '',
          formulationLabel: data.formulationLabel ?? '',
          shortDescription: data.shortDescription ?? '',
          description: data.description ?? '',
          size: data.size ?? '',
          price: data.price ?? null,
          compareAtPrice: data.compareAtPrice ?? null,
          currency: data.currency ?? '',
          priceNote: data.priceNote ?? '',
          rating: data.rating ?? null,
          reviewCount: data.reviewCount ?? 0,
          badge: data.badge ?? '',
          badgeStyle: data.badgeStyle ?? 'primary',
          stockStatus: data.stockStatus ?? 'InStock',
          imageUrl: data.imageUrl ?? '',
          accentFrom: data.accentFrom ?? '#050d24',
          accentTo: data.accentTo ?? '#0e3b9c',
          benefits: data.benefits ?? [],
          ingredients: data.ingredients ?? [],
          howToUse: data.howToUse ?? '',
          safetyNote: data.safetyNote ?? '',
          suitableFor: data.suitableFor ?? '',
          isFeatured: data.isFeatured,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
          images: data.images.map((image) => ({
            url: image.url,
            alt: image.alt ?? '',
            sortOrder: image.sortOrder,
          })),
        })
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(errorMessage(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [productId, isNew])

  const brandOptions = useMemo(
    () => brands.filter((brand) => brand.categoryId === form.categoryId),
    [brands, form.categoryId],
  )

  /*
   * The canonical list, plus whatever the product or the configured default already
   * carries. The setting is free text, and a native select whose value is not among its
   * options renders blank — which would hide the very default this field exists to start
   * from.
   */
  const currencyOptions = useMemo(
    () =>
      Array.from(
        new Set(['AFN', 'USD', 'PKR', 'IRR', 'EUR', form.currency, settings.currency].filter(Boolean)),
      ),
    [form.currency, settings.currency],
  )

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const onSave = async () => {
    if (!form.name.trim()) {
      dispatch(pushToast({ tone: 'error', title: 'A product name is required' }))
      setSection('basics')
      return
    }
    if (!form.categoryId || !form.brandId) {
      dispatch(pushToast({ tone: 'error', title: 'Select a collection and a brand' }))
      setSection('basics')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        currency: form.currency || settings.currency,
        images: form.images.map((image, index) => ({ ...image, sortOrder: index })),
      }
      if (isNew) await api.post(endpoints.admin.products, payload)
      else await api.put(endpoints.admin.product(Number(productId)), payload)

      dispatch(pushToast({ tone: 'success', title: isNew ? 'Product created' : 'Product saved' }))
      navigate('/admin/products')
    } catch (err) {
      dispatch(pushToast({ tone: 'error', title: 'Could not save product', description: errorMessage(err) }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader label="Loading product" />

  if (error) {
    return (
      <>
        <AdminPageHeader title="Edit product" />
        <ErrorState title="Could not load this product" description={error} />
      </>
    )
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title={isNew ? 'New product' : form.name || 'Edit product'}
        description="Products live inside a brand, and brands live inside a collection."
        actions={
          <>
            <ButtonLink to="/admin/products" variant="ghost" icon="arrow_back">
              Back
            </ButtonLink>
            {!isNew && form.slug ? (
              <ButtonLink to={`/products/${form.slug}`} variant="outline" icon="visibility">
                Preview
              </ButtonLink>
            ) : null}
            <Button variant="primary" icon="save" onClick={onSave} loading={saving}>
              {isNew ? 'Create product' : 'Save changes'}
            </Button>
          </>
        }
      />

      {/* Section rail */}
      <div className="mb-space-lg flex flex-wrap items-center gap-1.5 rounded-full bg-surface-container-low p-1">
        {SECTIONS.map((item) => {
          const isActive = section === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={cn(
                'relative flex items-center gap-2 rounded-full px-4 py-2.5 text-label-md font-semibold transition-colors duration-300',
                isActive ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="editor-tab"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-surface-container-lowest shadow-sm"
                />
              ) : null}
              <Icon name={item.icon} size={15} className="relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-space-lg xl:grid-cols-3">
        <div className="flex flex-col gap-space-lg xl:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col gap-space-lg"
            >
              {section === 'basics' ? (
                <AdminCard title="Product basics">
                  <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                    <Field label="Product name" required htmlFor="p-name" className="sm:col-span-2">
                      <TextInput
                        id="p-name"
                        value={form.name}
                        onChange={(event) => set('name', event.target.value)}
                        placeholder="e.g. Albaik Purify & Cleanse Shampoo"
                      />
                    </Field>

                    <Field label="Collection" required htmlFor="p-category">
                      <Select
                        id="p-category"
                        value={String(form.categoryId || '')}
                        onChange={(event) => {
                          set('categoryId', Number(event.target.value))
                          set('brandId', 0)
                        }}
                      >
                        <option value="">Select a collection…</option>
                        {categories.map((category) => (
                          <option key={category.id} value={String(category.id)}>
                            {category.name}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field
                      label="Brand"
                      required
                      htmlFor="p-brand"
                      hint={!form.categoryId ? 'Choose a collection first.' : undefined}
                    >
                      <Select
                        id="p-brand"
                        value={String(form.brandId || '')}
                        disabled={!form.categoryId}
                        onChange={(event) => set('brandId', Number(event.target.value))}
                      >
                        <option value="">Select a brand…</option>
                        {brandOptions.map((brand) => (
                          <option key={brand.id} value={String(brand.id)}>
                            {brand.name}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="URL slug" htmlFor="p-slug" hint="Leave blank to generate from the name.">
                      <TextInput
                        id="p-slug"
                        value={form.slug ?? ''}
                        onChange={(event) => set('slug', event.target.value)}
                      />
                    </Field>

                    <Field label="Size / volume" htmlFor="p-size">
                      <TextInput
                        id="p-size"
                        value={form.size ?? ''}
                        onChange={(event) => set('size', event.target.value)}
                        placeholder="e.g. 400 ML"
                      />
                    </Field>

                    <Field label="Subtitle" htmlFor="p-subtitle" className="sm:col-span-2">
                      <TextInput
                        id="p-subtitle"
                        value={form.subtitle ?? ''}
                        onChange={(event) => set('subtitle', event.target.value)}
                        placeholder="One-line summary shown under the title"
                      />
                    </Field>

                    <Field label="Formulation label" htmlFor="p-formulation">
                      <TextInput
                        id="p-formulation"
                        value={form.formulationLabel ?? ''}
                        onChange={(event) => set('formulationLabel', event.target.value)}
                        placeholder="e.g. Amethyst Balance Formula"
                      />
                    </Field>

                    <Field label="Overlay badge" htmlFor="p-badge" hint="Short label shown on the product image.">
                      <TextInput
                        id="p-badge"
                        value={form.badge ?? ''}
                        onChange={(event) => set('badge', event.target.value)}
                        placeholder="e.g. Post-Oil Shield"
                      />
                    </Field>

                    <Field label="Badge accent" htmlFor="p-badgestyle">
                      <Select
                        id="p-badgestyle"
                        value={form.badgeStyle ?? 'primary'}
                        onChange={(event) => set('badgeStyle', event.target.value)}
                      >
                        {['primary', 'secondary', 'teal', 'gold'].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Stock status" htmlFor="p-stock">
                      <Select
                        id="p-stock"
                        value={form.stockStatus ?? 'InStock'}
                        onChange={(event) => set('stockStatus', event.target.value)}
                      >
                        <option value="InStock">Available</option>
                        <option value="OutOfStock">Out of stock</option>
                        <option value="Discontinued">Discontinued</option>
                      </Select>
                    </Field>

                    <Field label="Sort order" htmlFor="p-order" hint="Lower numbers appear first.">
                      <TextInput
                        id="p-order"
                        type="number"
                        value={String(form.sortOrder)}
                        onChange={(event) => set('sortOrder', Number(event.target.value))}
                      />
                    </Field>

                    <div className="flex flex-col gap-space-sm sm:col-span-2">
                      <Toggle
                        checked={form.isFeatured}
                        onChange={(value) => set('isFeatured', value)}
                        label="Feature on the home page"
                        description="Featured products appear in the Signature Formulations grid."
                      />
                      <Toggle
                        checked={form.isActive}
                        onChange={(value) => set('isActive', value)}
                        label="Visible on the website"
                        description="Unpublished products are hidden from the catalogue and search."
                      />
                    </div>
                  </div>
                </AdminCard>
              ) : null}

              {section === 'pricing' ? (
                <AdminCard
                  title="Pricing"
                  description="Leave the price blank to show your fallback label instead — useful while wholesale pricing is under review."
                >
                  <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                    <Field label="Retail price" htmlFor="p-price">
                      <TextInput
                        id="p-price"
                        type="number"
                        step="0.01"
                        value={form.price === null || form.price === undefined ? '' : String(form.price)}
                        onChange={(event) =>
                          set('price', event.target.value === '' ? null : Number(event.target.value))
                        }
                        placeholder="Leave blank for “on request”"
                      />
                    </Field>

                    <Field label="Compare-at price" htmlFor="p-compare" hint="Optional. Shown struck through.">
                      <TextInput
                        id="p-compare"
                        type="number"
                        step="0.01"
                        value={
                          form.compareAtPrice === null || form.compareAtPrice === undefined
                            ? ''
                            : String(form.compareAtPrice)
                        }
                        onChange={(event) =>
                          set('compareAtPrice', event.target.value === '' ? null : Number(event.target.value))
                        }
                      />
                    </Field>

                    <Field label="Currency" htmlFor="p-currency">
                      <Select
                        id="p-currency"
                        value={form.currency || settings.currency}
                        onChange={(event) => set('currency', event.target.value)}
                      >
                        {currencyOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Price note" htmlFor="p-pricenote">
                      <TextInput
                        id="p-pricenote"
                        value={form.priceNote ?? ''}
                        onChange={(event) => set('priceNote', event.target.value)}
                        placeholder="e.g. Wholesale pricing on request"
                      />
                    </Field>

                    <Field label="Rating" htmlFor="p-rating" hint="Only enter a rating you can substantiate.">
                      <TextInput
                        id="p-rating"
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={form.rating === null || form.rating === undefined ? '' : String(form.rating)}
                        onChange={(event) =>
                          set('rating', event.target.value === '' ? null : Number(event.target.value))
                        }
                      />
                    </Field>

                    <Field label="Review count" htmlFor="p-reviews">
                      <TextInput
                        id="p-reviews"
                        type="number"
                        value={String(form.reviewCount)}
                        onChange={(event) => set('reviewCount', Number(event.target.value))}
                      />
                    </Field>
                  </div>
                </AdminCard>
              ) : null}

              {section === 'copy' ? (
                <AdminCard title="Description & usage">
                  <div className="flex flex-col gap-space-md">
                    <Field
                      label="Short description"
                      htmlFor="p-short"
                      hint="Shown on product cards. Keep it to one or two lines."
                    >
                      <TextArea
                        id="p-short"
                        rows={2}
                        value={form.shortDescription ?? ''}
                        onChange={(event) => set('shortDescription', event.target.value)}
                      />
                    </Field>

                    <Field label="Full description" htmlFor="p-desc">
                      <TextArea
                        id="p-desc"
                        rows={5}
                        value={form.description ?? ''}
                        onChange={(event) => set('description', event.target.value)}
                      />
                    </Field>

                    <Field
                      label="How to use"
                      htmlFor="p-howto"
                      hint="Copy this from the approved product label."
                    >
                      <TextArea
                        id="p-howto"
                        rows={3}
                        value={form.howToUse ?? ''}
                        onChange={(event) => set('howToUse', event.target.value)}
                      />
                    </Field>

                    <Field label="Safety information" htmlFor="p-safety">
                      <TextArea
                        id="p-safety"
                        rows={3}
                        value={form.safetyNote ?? ''}
                        onChange={(event) => set('safetyNote', event.target.value)}
                      />
                    </Field>

                    <Field label="Suitable for" htmlFor="p-suitable">
                      <TextInput
                        id="p-suitable"
                        value={form.suitableFor ?? ''}
                        onChange={(event) => set('suitableFor', event.target.value)}
                        placeholder="e.g. Dry, weak and damaged-looking hair"
                      />
                    </Field>
                  </div>
                </AdminCard>
              ) : null}

              {section === 'benefits' ? (
                <AdminCard
                  title="Benefits & ingredient highlights"
                  description="Press Enter or comma to add each entry. Keep benefit statements to what the approved label supports."
                >
                  <div className="flex flex-col gap-space-md">
                    <Field label="Key benefits" htmlFor="p-benefits">
                      <TagInput
                        id="p-benefits"
                        value={form.benefits}
                        onChange={(value) => set('benefits', value)}
                        placeholder="e.g. Helps reduce dandruff"
                      />
                    </Field>

                    <Field
                      label="Ingredient / technology highlights"
                      htmlFor="p-ingredients"
                      hint="Short tags only. Publish full INCI lists from approved documentation."
                    >
                      <TagInput
                        id="p-ingredients"
                        value={form.ingredients}
                        onChange={(value) => set('ingredients', value)}
                        placeholder="e.g. Biotin, Keratin"
                      />
                    </Field>
                  </div>
                </AdminCard>
              ) : null}

              {section === 'media' ? (
                <AdminCard title="Media">
                  <div className="flex flex-col gap-space-md">
                    <Field label="Primary image" htmlFor="p-image" hint="Choose a file, or paste a URL.">
                      <ImageField
                        id="p-image"
                        kind="product-photo"
                        value={form.imageUrl ?? ''}
                        onChange={(url) => set('imageUrl', url)}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-space-md">
                      <Field label="Gradient from" htmlFor="p-accent-from" hint="Fallback artwork colour.">
                        <div className="flex items-center gap-2">
                          <input
                            id="p-accent-from"
                            type="color"
                            value={form.accentFrom ?? '#050d24'}
                            onChange={(event) => set('accentFrom', event.target.value)}
                            className="size-10 cursor-pointer rounded-lg border border-primary-container/15 bg-clinical-white p-1"
                          />
                          <TextInput
                            value={form.accentFrom ?? ''}
                            onChange={(event) => set('accentFrom', event.target.value)}
                          />
                        </div>
                      </Field>

                      <Field label="Gradient to" htmlFor="p-accent-to">
                        <div className="flex items-center gap-2">
                          <input
                            id="p-accent-to"
                            type="color"
                            value={form.accentTo ?? '#0e3b9c'}
                            onChange={(event) => set('accentTo', event.target.value)}
                            className="size-10 cursor-pointer rounded-lg border border-primary-container/15 bg-clinical-white p-1"
                          />
                          <TextInput
                            value={form.accentTo ?? ''}
                            onChange={(event) => set('accentTo', event.target.value)}
                          />
                        </div>
                      </Field>
                    </div>

                    <div className="flex flex-col gap-space-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
                          Gallery ({form.images.length})
                        </span>
                        <ImageGalleryField
                          onAdd={(urls) =>
                            setForm((prev) => ({
                              ...prev,
                              images: [
                                ...prev.images,
                                ...urls.map((url, index) => ({
                                  url,
                                  alt: prev.name,
                                  sortOrder: prev.images.length + index,
                                })),
                              ],
                            }))
                          }
                        />
                      </div>

                      {form.images.length ? (
                        <ul className="flex flex-col gap-2">
                          {form.images.map((image, index) => (
                            <li
                              key={`${image.url}-${index}`}
                              className="flex items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low/50 p-2"
                            >
                              <GripVertical size={15} className="shrink-0 text-on-surface-variant" />
                              <ProductImage
                                src={image.url}
                                alt={image.alt}
                                name={form.name || 'Product'}
                                zoomOnHover={false}
                                className="aspect-[4/5] w-10 shrink-0 rounded-lg"
                              />
                              <TextInput
                                value={image.url}
                                onChange={(event) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    images: prev.images.map((item, i) =>
                                      i === index ? { ...item, url: event.target.value } : item,
                                    ),
                                  }))
                                }
                                className="min-w-0 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    images: prev.images.filter((_, i) => i !== index),
                                  }))
                                }
                                className="shrink-0 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
                                aria-label="Remove image"
                              >
                                <Trash2 size={15} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low/40 p-4 text-center text-body-sm text-on-surface-variant">
                          No gallery images yet. The product falls back to a branded gradient plate.
                        </p>
                      )}
                    </div>
                  </div>
                </AdminCard>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-wrap items-center justify-end gap-space-sm">
            <ButtonLink to="/admin/products" variant="ghost">
              Cancel
            </ButtonLink>
            <Button variant="primary" icon="save" onClick={onSave} loading={saving}>
              {isNew ? 'Create product' : 'Save changes'}
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------------ preview */}
        <div className="xl:col-span-1">
          <div className="sticky top-space-lg flex flex-col gap-space-md">
            <AdminCard title="Live preview" delay={0.05}>
              <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest">
                <ProductImage
                  src={form.imageUrl}
                  alt={form.name}
                  name={form.name || 'New product'}
                  accentFrom={form.accentFrom}
                  accentTo={form.accentTo}
                  zoomOnHover={false}
                  className="aspect-[4/5] w-full"
                />
                <div className="flex flex-col gap-2 p-space-md">
                  <span className="text-label-md font-bold uppercase tracking-wider text-secondary">
                    {form.formulationLabel || 'Formulation'}
                  </span>
                  <span className="font-display text-headline-sm font-semibold text-on-surface">
                    {form.name || 'Product name'}
                  </span>
                  <span className="line-clamp-2 text-body-sm text-on-surface-variant">
                    {form.shortDescription || 'Short description appears here.'}
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.ingredients.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-surface-container-low px-2.5 py-1 text-label-sm font-semibold text-on-surface"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="mt-1 font-display text-headline-sm font-bold text-primary">
                    {form.price === null || form.price === undefined
                      ? 'Price on request'
                      : `${form.price} ${form.currency || settings.currency}`}
                  </span>
                </div>
              </div>
            </AdminCard>

            <AdminCard title="Publishing checklist" delay={0.1}>
              <ul className="flex flex-col gap-2 text-body-sm">
                {[
                  { ok: Boolean(form.name), label: 'Product name' },
                  { ok: Boolean(form.categoryId), label: 'Collection selected' },
                  { ok: Boolean(form.brandId), label: 'Brand selected' },
                  { ok: form.benefits.length > 0, label: 'At least one benefit' },
                  { ok: Boolean(form.imageUrl), label: 'Primary image (optional)' },
                  { ok: Boolean(form.howToUse), label: 'Usage instructions' },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <Icon
                      name={item.ok ? 'check_circle' : 'info'}
                      size={15}
                      className={item.ok ? 'text-marine' : 'text-on-surface-variant'}
                    />
                    <span className={item.ok ? 'text-on-surface' : 'text-on-surface-variant'}>{item.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-outline-variant/40 pt-3 text-label-sm text-on-surface-variant">
                Need the full catalogue?{' '}
                <Link to="/admin/products" className="font-semibold text-secondary hover:underline">
                  Back to products
                </Link>
              </p>
            </AdminCard>
          </div>
        </div>
      </div>
    </>
  )
}
