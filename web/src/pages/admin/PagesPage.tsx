import { Link } from 'react-router-dom'
import { CrudManager, type CrudConfig } from '@/components/admin/CrudManager'
import { Chip } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/lib/utils'
import type { Page } from '@/lib/types'

/** Static page slugs have dedicated public routes; anything else is served at /pages/<slug>. */
const PUBLIC_PATH: Record<string, string> = {
  about: '/about',
  quality: '/quality',
  safety: '/safety',
  distribution: '/distribution',
  privacy: '/privacy',
  terms: '/terms',
  'shampoo-guide': '/guides/shampoo-guide',
  'how-to-use': '/guides/how-to-use',
}

const config: CrudConfig<Page> = {
  resource: 'pages',
  title: 'Content pages',
  singular: 'Page',
  eyebrow: 'Website content',
  description:
    'Long-form pages such as About, Product Quality, Safety and the usage guides. Body content accepts HTML.',
  labelKey: 'title',
  searchKeys: ['title', 'slug', 'subtitle'],
  addLabel: 'New page',
  banner: (
    <div className="mb-space-md rounded-xl border-l-[3px] border-accent-gold bg-surface-container-low p-space-sm">
      <p className="text-body-sm text-on-surface-variant">
        The seeded pages are drawn from your approved content document. Review anything you did not write yourself
        before publishing, and replace the privacy and terms placeholders with your approved legal copy.
      </p>
    </div>
  ),
  columns: [
    {
      key: 'title',
      label: 'Page',
      render: (row) => {
        const href = PUBLIC_PATH[row.slug] ?? `/pages/${row.slug}`
        return (
          <div className="flex flex-col">
            <Link to={href} target="_blank" className="inline-flex items-center gap-1.5 font-semibold text-on-surface hover:text-secondary">
              {row.title}
              <Icon name="open_in_new" size={12} className="text-on-surface-variant" />
            </Link>
            <code className="font-mono text-label-sm text-on-surface-variant">{href}</code>
          </div>
        )
      },
    },
    { key: 'eyebrow', label: 'Eyebrow', render: (row) => row.eyebrow ?? '—' },
    { key: 'sortOrder', label: 'Order', align: 'center' },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (row) => <span className="text-on-surface-variant">{formatDate(row.updatedAt)}</span>,
    },
    {
      key: 'isPublished',
      label: 'Status',
      render: (row) => (
        <Chip accent={row.isPublished ? 'success' : 'neutral'}>{row.isPublished ? 'Published' : 'Draft'}</Chip>
      ),
    },
  ],
  fields: [
    { name: 'title', label: 'Page title', type: 'text', required: true, span: 2 },
    {
      name: 'slug',
      label: 'URL slug',
      type: 'text',
      hint: 'Changing this changes the public URL. Known slugs get a dedicated route.',
    },
    { name: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { name: 'subtitle', label: 'Subtitle', type: 'textarea', rows: 2, span: 2 },
    {
      name: 'contentHtml',
      label: 'Body content (HTML)',
      type: 'textarea',
      rows: 12,
      span: 2,
      hint: 'Supports <p>, <h2>, <ul><li>, <strong> and <a href>.',
    },
    { name: 'metaDescription', label: 'Meta description', type: 'textarea', rows: 2, span: 2, hint: 'Used by search engines.' },
    { name: 'sortOrder', label: 'Sort order', type: 'number' },
    { name: 'isPublished', label: 'Published', type: 'bool' },
  ],
  defaults: {
    title: '',
    slug: '',
    eyebrow: '',
    subtitle: '',
    contentHtml: '<p></p>',
    metaDescription: '',
    sortOrder: 0,
    isPublished: true,
  },
}

export default function PagesPage() {
  return <CrudManager config={config} />
}
