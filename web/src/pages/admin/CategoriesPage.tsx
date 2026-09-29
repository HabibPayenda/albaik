import { CrudManager, type CrudConfig } from '@/components/admin/CrudManager'
import { Chip } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import type { Category } from '@/lib/types'

const config: CrudConfig<Category> = {
  resource: 'categories',
  title: 'Collections',
  singular: 'Collection',
  eyebrow: 'Catalogue',
  description:
    'The top level of the catalogue. Every collection contains brands, and every brand contains products.',
  labelKey: 'name',
  searchKeys: ['name', 'slug', 'tagline'],
  reorderable: true,
  addLabel: 'New collection',
  columns: [
    {
      key: 'name',
      label: 'Collection',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-royal-gradient-compact text-accent-gold">
            <Icon name={row.icon} size={15} />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-on-surface">{row.name}</span>
            <code className="truncate font-mono text-label-sm text-on-surface-variant">/{row.slug}</code>
          </div>
        </div>
      ),
    },
    {
      key: 'brandCount',
      label: 'Brands',
      align: 'center',
      render: (row) => <span className="font-semibold">{row.brandCount}</span>,
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
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Hair Care' },
    { name: 'slug', label: 'URL slug', type: 'text', hint: 'Leave blank to generate from the name.' },
    { name: 'nameDari', label: 'Name (Dari)', type: 'text' },
    { name: 'namePashto', label: 'Name (Pashto)', type: 'text' },
    { name: 'tagline', label: 'Tagline', type: 'text', span: 2 },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, span: 2 },
    { name: 'icon', label: 'Icon', type: 'icon' },
    {
      name: 'accent',
      label: 'Accent colour',
      type: 'select',
      options: ['primary', 'secondary', 'teal', 'gold'].map((v) => ({ value: v, label: v })),
    },
    { name: 'imageUrl', label: 'Collection image', type: 'image', span: 2 },
    { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
    { name: 'showInNav', label: 'Include in the header mega-menu', type: 'bool' },
    { name: 'isActive', label: 'Visible on the website', type: 'bool' },
  ],
  defaults: {
    name: '',
    slug: '',
    nameDari: '',
    namePashto: '',
    tagline: '',
    description: '',
    icon: 'spa',
    accent: 'primary',
    imageUrl: '',
    sortOrder: 0,
    showInNav: true,
    isActive: true,
  },
}

export default function CategoriesPage() {
  return <CrudManager config={config} />
}
