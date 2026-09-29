import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadCategories } from '@/store/adminSlice'
import { CrudManager, type CrudConfig } from '@/components/admin/CrudManager'
import { Chip } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import type { Brand, Category } from '@/lib/types'

export default function BrandsPage() {
  const dispatch = useAppDispatch()
  // The admin slice stores collections as `unknown[]`; narrow at the point of use.
  const categories = useAppSelector((state) => state.admin.categories.items) as Category[]

  useEffect(() => {
    if (!categories.length) dispatch(loadCategories())
  }, [categories.length, dispatch])

  // Options depend on the live category list, so the config is built per render.
  const config: CrudConfig<Brand> = useMemo(
    () => ({
      resource: 'brands',
      title: 'Brands',
      singular: 'Brand',
      eyebrow: 'Catalogue',
      description:
        'The middle level of the catalogue. A brand always belongs to one collection — the same brand name can appear in several collections.',
      labelKey: 'name',
      searchKeys: ['name', 'slug', 'tagline'],
      addLabel: 'New brand',
      columns: [
        {
          key: 'name',
          label: 'Brand',
          render: (row) => (
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-secondary">
                <Icon name="brand" size={15} />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold text-on-surface">{row.name}</span>
                <span className="truncate text-label-sm text-on-surface-variant">
                  {row.tagline ?? `/${row.slug}`}
                </span>
              </div>
            </div>
          ),
        },
        {
          key: 'categoryName',
          label: 'Collection',
          render: (row) =>
            row.categorySlug ? (
              <Link
                to={`/collections/${row.categorySlug}`}
                className="inline-flex items-center gap-1.5 text-secondary hover:underline"
              >
                {row.categoryName}
                <Icon name="open_in_new" size={12} />
              </Link>
            ) : (
              <span className="text-on-surface-variant">—</span>
            ),
        },
        {
          key: 'productCount',
          label: 'Products',
          align: 'center',
          render: (row) => <span className="font-semibold">{row.productCount}</span>,
        },
        { key: 'sortOrder', label: 'Order', align: 'center' },
        {
          key: 'isActive',
          label: 'Status',
          render: (row) => (
            <Chip accent={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Live' : 'Hidden'}</Chip>
          ),
        },
      ],
      fields: [
        { name: 'name', label: 'Brand name', type: 'text', required: true, placeholder: 'e.g. Avora Shine' },
        {
          name: 'categoryId',
          label: 'Collection',
          type: 'select',
          required: true,
          numeric: true,
          options: categories.map((c) => ({ value: String(c.id), label: c.name })),
          hint: 'Which collection does this brand sit inside?',
        },
        { name: 'slug', label: 'URL slug', type: 'text', hint: 'Leave blank to generate from the name.' },
        { name: 'tagline', label: 'Tagline', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3, span: 2 },
        {
          name: 'accent',
          label: 'Accent colour',
          type: 'select',
          options: ['primary', 'secondary', 'teal', 'gold'].map((v) => ({ value: v, label: v })),
        },
        { name: 'logoUrl', label: 'Logo', type: 'image', aspect: 'square' },
        { name: 'imageUrl', label: 'Banner image', type: 'image', span: 2 },
        { name: 'sortOrder', label: 'Sort order', type: 'number' },
        { name: 'isFeatured', label: 'Feature this brand', type: 'bool' },
        { name: 'isActive', label: 'Visible on the website', type: 'bool' },
      ],
      defaults: {
        name: '',
        slug: '',
        categoryId: categories[0]?.id ?? 0,
        tagline: '',
        description: '',
        accent: 'secondary',
        logoUrl: '',
        imageUrl: '',
        sortOrder: 0,
        isFeatured: false,
        isActive: true,
      },
    }),
    [categories],
  )

  return <CrudManager config={config} />
}
