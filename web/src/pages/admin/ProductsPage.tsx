import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadBrands, loadCategories, loadProducts, deleteResource } from '@/store/adminSlice'
import { pushToast } from '@/store/uiSlice'
import { AdminCard, AdminPageHeader, AdminToolbar } from '@/components/admin/AdminUI'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Field, Select, TextInput } from '@/components/ui/Field'
import { Chip } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { ProductImage } from '@/components/ui/ProductImage'
import { formatPrice } from '@/lib/utils'
import type { Brand, Category, ProductCard } from '@/lib/types'

export default function ProductsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const products = useAppSelector((state) => state.admin.products.items) as ProductCard[]
  const status = useAppSelector((state) => state.admin.products.status)
  const saving = useAppSelector((state) => state.admin.products.saving)
  // The admin slice stores collections as `unknown[]`; narrow at the point of use.
  const categories = useAppSelector((state) => state.admin.categories.items) as Category[]
  const brands = useAppSelector((state) => state.admin.brands.items) as Brand[]

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [pendingDelete, setPendingDelete] = useState<ProductCard | null>(null)

  useEffect(() => {
    dispatch(loadProducts())
    dispatch(loadCategories())
    dispatch(loadBrands())
  }, [dispatch])

  const brandOptions = useMemo(
    () => (categoryId ? brands.filter((b) => String(b.categoryId) === categoryId) : brands),
    [brands, categoryId],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((product) => {
      if (categoryId && String(product.categoryId) !== categoryId) return false
      if (brandId && String(product.brandId) !== brandId) return false
      if (!term) return true
      return (
        product.name.toLowerCase().includes(term) ||
        (product.brandName ?? '').toLowerCase().includes(term) ||
        (product.categoryName ?? '').toLowerCase().includes(term)
      )
    })
  }, [products, search, categoryId, brandId])

  const onDelete = async () => {
    if (!pendingDelete) return
    const result = await dispatch(deleteResource({ resource: 'products', id: pendingDelete.id }))
    if (deleteResource.fulfilled.match(result)) {
      dispatch(pushToast({ tone: 'success', title: `"${pendingDelete.name}" deleted` }))
    } else {
      dispatch(
        pushToast({
          tone: 'error',
          title: 'Could not delete product',
          description: String(result.payload ?? ''),
        }),
      )
    }
    setPendingDelete(null)
  }

  const columns: Column<ProductCard>[] = [
    {
      key: 'name',
      label: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          <ProductImage
            src={row.imageUrl}
            alt={row.name}
            name={row.name}
            accentFrom={row.accentFrom}
            accentTo={row.accentTo}
            zoomOnHover={false}
            className="aspect-[4/5] w-9 shrink-0 rounded-lg"
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-on-surface">{row.name}</span>
            <span className="truncate text-label-sm text-on-surface-variant">
              {row.formulationLabel ?? row.subtitle ?? '—'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      label: 'Collection',
      render: (row) => <Chip accent="secondary">{row.categoryName ?? '—'}</Chip>,
    },
    { key: 'brandName', label: 'Brand', render: (row) => row.brandName ?? '—' },
    {
      key: 'price',
      label: 'Price',
      render: (row) => (
        <span className={row.price === null || row.price === undefined ? 'text-on-surface-variant' : 'font-semibold'}>
          {formatPrice(row.price, row.currency, 'On request')}
        </span>
      ),
    },
    { key: 'size', label: 'Size', render: (row) => row.size ?? '—' },
    {
      key: 'isFeatured',
      label: 'Featured',
      align: 'center',
      render: (row) =>
        row.isFeatured ? (
          <Icon name="star" size={16} className="mx-auto text-accent-gold" />
        ) : (
          <span className="text-on-surface-variant">—</span>
        ),
    },
  ]

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Every product in the catalogue, grouped by collection and brand."
        actions={
          <ButtonLink to="/admin/products/new" variant="primary" icon="add">
            New product
          </ButtonLink>
        }
      />

      <AdminCard bodyClassName="p-0">
        <div className="p-space-md">
          <AdminToolbar className="mb-0">
            <Field label="Search" htmlFor="product-search" className="w-full max-w-xs">
              <TextInput
                id="product-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, brand or collection…"
              />
            </Field>

            <Field label="Collection" htmlFor="product-category" className="w-full max-w-[12rem]">
              <Select
                id="product-category"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value)
                  setBrandId('')
                }}
              >
                <option value="">All collections</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Brand" htmlFor="product-brand" className="w-full max-w-[12rem]">
              <Select id="product-brand" value={brandId} onChange={(event) => setBrandId(event.target.value)}>
                <option value="">All brands</option>
                {brandOptions.map((brand) => (
                  <option key={brand.id} value={String(brand.id)}>
                    {brand.name}
                    {!categoryId ? ` — ${brand.categoryName}` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            {search || categoryId || brandId ? (
              <Button
                variant="ghost"
                icon="close"
                onClick={() => {
                  setSearch('')
                  setCategoryId('')
                  setBrandId('')
                }}
              >
                Clear
              </Button>
            ) : null}

            <span className="ml-auto text-body-sm text-on-surface-variant">
              {filtered.length} of {products.length}
            </span>
          </AdminToolbar>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          loading={status === 'loading'}
          emptyMessage="No products match those filters."
          onRowClick={(row) => navigate(`/admin/products/${row.id}`)}
          actions={[
            { icon: 'edit', label: 'Edit', tone: 'primary', onClick: (row) => navigate(`/admin/products/${row.id}`) },
            { icon: 'visibility', label: 'View on site', onClick: (row) => window.open(`/products/${row.slug}`, '_blank') },
            { icon: 'delete', label: 'Delete', tone: 'danger', onClick: setPendingDelete },
          ]}
        />
      </AdminCard>

      <div className="mt-space-md rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-space-md">
        <p className="text-body-sm text-on-surface-variant">
          Looking for the public page?{' '}
          <Link to="/collections" className="font-semibold text-secondary hover:underline">
            Browse the live catalogue
          </Link>
          .
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={onDelete}
        title="Delete this product?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" and its gallery images will be permanently removed from the catalogue.`
            : undefined
        }
        busy={saving}
      />
    </>
  )
}
