import type { CrudConfig } from '@/components/admin/CrudManager'
import { Chip } from '@/components/ui/Badge'
import { StarRating } from '@/components/ui/StarRating'
import { Icon } from '@/components/ui/Icon'
import type { HairProfile, HeroStat, Testimonial, TrustPillar } from '@/lib/types'

/**
 * Five feeds rendered on the home page — hero statistics, trust pillars, testimonials
 * and hair profiles are all edited from the tabbed Home page screen. Each config runs
 * through the same schema-driven CrudManager the standalone screens used, so the list,
 * form and up/down reordering behave exactly as before.
 */

export const heroStatsConfig: CrudConfig<HeroStat> = {
  resource: 'heroStats',
  title: 'Hero statistics',
  singular: 'Hero statistic',
  eyebrow: 'Home page',
  description:
    'The three metric tiles under the hero headline. Use only figures that are accurate — for example the number of collections or products actually published.',
  labelKey: 'label',
  addLabel: 'Add statistic',
  reorderable: true,
  columns: [
    {
      key: 'value',
      label: 'Value',
      render: (row) => <span className="font-display text-headline-sm font-bold text-primary">{row.value}</span>,
    },
    { key: 'label', label: 'Label', render: (row) => <span className="font-semibold">{row.label}</span> },
    {
      key: 'accent',
      label: 'Accent',
      render: (row) => <Chip accent={(row.accent as never) ?? 'primary'}>{row.accent ?? 'primary'}</Chip>,
    },
    { key: 'sortOrder', label: 'Order', align: 'center' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <Chip accent={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Shown' : 'Hidden'}</Chip>,
    },
  ],
  fields: [
    { name: 'value', label: 'Value', type: 'text', required: true, placeholder: 'e.g. 20+' },
    { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g. Products' },
    {
      name: 'accent',
      label: 'Accent',
      type: 'select',
      options: ['primary', 'secondary', 'teal', 'gold'].map((v) => ({ value: v, label: v })),
    },
    { name: 'sortOrder', label: 'Sort order', type: 'number' },
    { name: 'isActive', label: 'Show on the website', type: 'bool' },
  ],
  defaults: { value: '', label: '', accent: 'primary', sortOrder: 0, isActive: true },
}

export const pillarsConfig: CrudConfig<TrustPillar> = {
  resource: 'pillars',
  title: 'Trust pillars',
  singular: 'Trust pillar',
  eyebrow: 'Home page',
  description:
    'The four assurance points shown beneath the reviews (quality, verification, distribution, standard).',
  labelKey: 'title',
  searchKeys: ['title', 'subtitle'],
  reorderable: true,
  addLabel: 'Add pillar',
  columns: [
    {
      key: 'title',
      label: 'Pillar',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-secondary">
            <Icon name={row.icon} size={16} />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-on-surface">{row.title}</span>
            <span className="truncate text-label-sm text-on-surface-variant">{row.subtitle ?? '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'accent', label: 'Accent', render: (row) => <Chip accent={(row.accent as never) ?? 'secondary'}>{row.accent ?? 'secondary'}</Chip> },
    { key: 'sortOrder', label: 'Order', align: 'center' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <Chip accent={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Shown' : 'Hidden'}</Chip>,
    },
  ],
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g. Consistent quality' },
    { name: 'icon', label: 'Icon', type: 'icon' },
    { name: 'subtitle', label: 'Supporting line', type: 'text', span: 2 },
    {
      name: 'accent',
      label: 'Accent colour',
      type: 'select',
      options: ['secondary', 'primary', 'teal', 'gold'].map((v) => ({ value: v, label: v })),
    },
    { name: 'sortOrder', label: 'Sort order', type: 'number' },
    { name: 'isActive', label: 'Show on the website', type: 'bool', span: 2 },
  ],
  defaults: { title: '', subtitle: '', icon: 'verified_user', accent: 'secondary', sortOrder: 0, isActive: true },
}

export const testimonialsConfig: CrudConfig<Testimonial> = {
  resource: 'testimonials',
  title: 'Testimonials',
  singular: 'Testimonial',
  eyebrow: 'Social proof',
  description:
    'Customer reviews shown on the home page. Only publish reviews you have written permission to use — the seeded rows ship disabled.',
  labelKey: 'name',
  searchKeys: ['name', 'role', 'quote'],
  reorderable: true,
  addLabel: 'Add testimonial',
  columns: [
    {
      key: 'name',
      label: 'Author',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-royal-gradient-compact text-label-sm font-bold text-white">
            {row.initials || row.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-on-surface">{row.name}</span>
            <span className="truncate text-label-sm text-on-surface-variant">{row.role ?? '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'title', label: 'Headline', render: (row) => row.title ?? '—' },
    {
      key: 'rating',
      label: 'Rating',
      render: (row) => <StarRating value={row.rating} showValue={false} />,
    },
    { key: 'sortOrder', label: 'Order', align: 'center' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (
        <Chip accent={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Published' : 'Hidden'}</Chip>
      ),
    },
  ],
  fields: [
    { name: 'name', label: 'Author name', type: 'text', required: true, placeholder: 'e.g. Soraya Noori' },
    { name: 'initials', label: 'Initials', type: 'text', hint: 'Shown in the avatar circle. Auto-derived if blank.' },
    { name: 'role', label: 'Role / location', type: 'text', span: 2, placeholder: 'e.g. Salon owner, Kabul' },
    { name: 'title', label: 'Review headline', type: 'text', span: 2, placeholder: 'Short quote headline' },
    { name: 'quote', label: 'Full review', type: 'textarea', rows: 4, span: 2 },
    {
      name: 'rating',
      label: 'Star rating',
      type: 'select',
      numeric: true,
      options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? '' : 's'}` })),
    },
    { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
    { name: 'isActive', label: 'Publish on the website', type: 'bool', span: 2 },
  ],
  defaults: { name: '', initials: '', role: '', title: '', quote: '', rating: 5, sortOrder: 0, isActive: false },
}

export const profilesConfig: CrudConfig<HairProfile> = {
  resource: 'profiles',
  title: 'Hair profiles',
  singular: 'Hair profile',
  eyebrow: 'Home page',
  description:
    'The interactive selector in the "guided selection" panel. Metric values are optional — only enter figures you can support with approved documentation.',
  labelKey: 'title',
  searchKeys: ['title', 'description', 'badge'],
  reorderable: true,
  addLabel: 'Add profile',
  banner: (
    <div className="mb-space-md rounded-xl border-l-[3px] border-accent-gold bg-surface-container-low p-space-sm">
      <p className="text-body-sm text-on-surface-variant">
        <span className="font-semibold text-on-surface">Leave “Metric value” blank</span> unless the figure comes from
        approved product documentation. With it blank the panel shows the matched product instead of a statistic.
      </p>
    </div>
  ),
  columns: [
    {
      key: 'title',
      label: 'Profile',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-secondary">
            <Icon name={row.icon} size={16} />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold text-on-surface">{row.title}</span>
            <span className="truncate text-label-sm text-on-surface-variant">{row.badge ?? '—'}</span>
          </div>
        </div>
      ),
    },
    { key: 'key', label: 'Key', render: (row) => <code className="font-mono text-label-sm">{row.key}</code> },
    {
      key: 'metricValue',
      label: 'Metric',
      render: (row) =>
        row.metricValue ? (
          <span className="font-semibold text-on-surface">{row.metricValue}</span>
        ) : (
          <span className="text-on-surface-variant">Not set</span>
        ),
    },
    { key: 'sortOrder', label: 'Order', align: 'center' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <Chip accent={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Shown' : 'Hidden'}</Chip>,
    },
  ],
  fields: [
    { name: 'key', label: 'Key', type: 'text', required: true, hint: 'Unique, lowercase, e.g. "dandruff".' },
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'icon', label: 'Icon', type: 'icon' },
    { name: 'badge', label: 'Matched product badge', type: 'text', hint: 'e.g. "Anti-Dandruff".' },
    {
      name: 'badgeStyle',
      label: 'Badge accent',
      type: 'select',
      options: ['secondary', 'primary', 'teal', 'gold'].map((v) => ({ value: v, label: v })),
    },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3, span: 2 },
    { name: 'metricLabel', label: 'Metric label', type: 'text', hint: 'Optional heading for the statistic.' },
    { name: 'metricValue', label: 'Metric value', type: 'text', hint: 'Optional — leave blank unless approved.' },
    { name: 'sortOrder', label: 'Sort order', type: 'number' },
    { name: 'isActive', label: 'Show on the website', type: 'bool' },
  ],
  defaults: {
    key: '',
    title: '',
    icon: 'spa',
    badge: '',
    badgeStyle: 'secondary',
    description: '',
    metricLabel: '',
    metricValue: '',
    sortOrder: 0,
    isActive: true,
  },
}