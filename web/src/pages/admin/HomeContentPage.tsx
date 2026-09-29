import { useSearchParams } from 'react-router-dom'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { AdminPageHeader } from '@/components/admin/AdminUI'
import { CrudManager, type CrudConfig } from '@/components/admin/CrudManager'
import { HeroSlidesEditor } from '@/components/admin/HeroSlidesEditor'
import { Chip } from '@/components/ui/Badge'
import { heroStatsConfig, pillarsConfig, profilesConfig, testimonialsConfig } from './homeContent'
import type { HomeSection } from '@/lib/types'

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero section' },
  { value: 'collections', label: 'Collections grid' },
  { value: 'featured-products', label: 'Featured products' },
  { value: 'approach', label: 'Approach (trust pillars + guided selection)' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'distribution', label: 'Distribution panel' },
  { value: 'generic', label: 'Generic text' },
]

const sectionsConfig: CrudConfig<HomeSection> = {
  resource: 'homeSections',
  title: 'Home sections',
  singular: 'Home section',
  eyebrow: 'Home page',
  description:
    'The home sections that build the page, in the order they appear. Move a section with the arrows, hide the ones you are not using, and edit all copy here.',
  labelKey: 'title',
  searchKeys: ['title', 'key', 'eyebrow'],
  addLabel: 'Add section',
  reorderable: true,
  banner: (
    <div className="mb-space-md flex flex-col gap-space-sm rounded-xl border-l-[3px] border-secondary bg-surface-container-low p-space-sm">
      <p className="text-body-sm text-on-surface-variant">
        <span className="font-semibold text-on-surface">Section type</span> decides how the home page renders the
        section. Choosing a type that already appears elsewhere is fine — you can have two collections grids, for
        example.
      </p>
      <p className="text-body-sm text-on-surface-variant">
        <span className="font-semibold text-on-surface">Hero slides</span> are edited on the Hero slides tab, not
        here. The hero section's own extras (accent word, badge title and subtitle) live in the Extra data field as
        JSON, e.g.{' '}
        <code className="font-mono">{'{ "accentWord": "…", "badgeTitle": "…", "badgeSubtitle": "…" }'}</code>.
      </p>
    </div>
  ),
  columns: [
    {
      key: 'title',
      label: 'Home section',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-on-surface">{row.title ?? '(untitled)'}</span>
          <span className="text-label-sm text-on-surface-variant">
            <code className="font-mono">{row.key}</code> · {row.eyebrow ?? 'no eyebrow'}
          </span>
        </div>
      ),
    },
    {
      key: 'sectionType',
      label: 'Type',
      render: (row) => (
        <Chip accent="secondary">
          {SECTION_TYPES.find((type) => type.value === row.sectionType)?.label ?? row.sectionType}
        </Chip>
      ),
    },
    { key: 'sortOrder', label: 'Order', align: 'center' },
    {
      key: 'isVisible',
      label: 'Status',
      render: (row) => (
        <Chip accent={row.isVisible ? 'success' : 'neutral'}>{row.isVisible ? 'Visible' : 'Hidden'}</Chip>
      ),
    },
  ],
  fields: [
    { name: 'key', label: 'Key', type: 'text', required: true, hint: 'Unique lowercase identifier, e.g. "hero".' },
    { name: 'title', label: 'Heading', type: 'text', span: 2 },
    { name: 'eyebrow', label: 'Eyebrow (small label above the heading)', type: 'text', span: 2 },
    { name: 'subtitle', label: 'Sub-heading', type: 'textarea', rows: 2, span: 2 },
    { name: 'body', label: 'Body copy', type: 'textarea', rows: 4, span: 2 },
    {
      name: 'imageUrl',
      label: 'Section backdrop',
      type: 'image',
      span: 2,
      hint: 'The full-width photograph behind the section content.',
    },
    { name: 'primaryCtaLabel', label: 'Primary button label', type: 'text' },
    { name: 'primaryCtaHref', label: 'Primary button link', type: 'text', placeholder: '/collections' },
    { name: 'secondaryCtaLabel', label: 'Secondary button label', type: 'text' },
    { name: 'secondaryCtaHref', label: 'Secondary button link', type: 'text', placeholder: '/about' },
    { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear higher on the page.' },
    { name: 'isVisible', label: 'Visible on the home page', type: 'bool' },
    {
      name: 'sectionType',
      label: 'Section type',
      type: 'select',
      options: SECTION_TYPES,
      span: 2,
      hint: 'Only change this if you know the section\'s purpose — its type decides how the home page renders it.',
    },
    { name: 'dataJson', label: 'Extra data (JSON)', type: 'textarea', rows: 3, span: 2 },
  ],
  defaults: {
    key: '',
    title: '',
    eyebrow: '',
    subtitle: '',
    body: '',
    imageUrl: '',
    primaryCtaLabel: '',
    primaryCtaHref: '',
    secondaryCtaLabel: '',
    secondaryCtaHref: '',
    sortOrder: 0,
    isVisible: true,
    sectionType: 'generic',
    dataJson: '',
  },
}

const TABS = [
  { key: 'sections', label: 'Home sections', icon: 'layers' },
  { key: 'hero', label: 'Hero slides', icon: 'image' },
  { key: 'hero-stats', label: 'Hero statistics', icon: 'analytics' },
  { key: 'trust-pillars', label: 'Trust pillars', icon: 'verified_user' },
  { key: 'testimonials', label: 'Testimonials', icon: 'star' },
  { key: 'hair-profiles', label: 'Hair profiles', icon: 'spa' },
] as const

type HomeTab = (typeof TABS)[number]['key']

const TAB_KEYS = new Set<string>(TABS.map((tab) => tab.key))

/**
 * One screen for the whole home page.
 *
 * Every home section is edited from here: the hero carousel, the statistic tiles, the
 * trust pillars, the testimonials and the hair profiles each get a tab, and the
 * section list that ties them together is the "Home sections" tab. The active tab
 * lives in the URL (`?tab=`), so the old standalone dashboard routes can redirect here
 * and land on the exact content, and switching tabs keeps each list mounted — the
 * loaded rows, search term and any open form survive the switch.
 */
export default function HomeContentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const active: HomeTab = requested && TAB_KEYS.has(requested) ? (requested as HomeTab) : 'sections'

  const selectTab = (key: HomeTab) => {
    setSearchParams(key === 'sections' ? {} : { tab: key }, { replace: true })
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <AdminPageHeader
        eyebrow="Home page"
        title="Home page"
        description="Everything that makes up the public home page lives here — the hero carousel, statistic tiles, trust pillars, testimonials and hair profiles. Pick a tab to edit one area."
      />

      <AdminTabs tabs={TABS} active={active} onChange={selectTab} />

      <div hidden={active !== 'sections'}>
        <CrudManager config={sectionsConfig} embedded />
      </div>
      <div hidden={active !== 'hero'}>
        <HeroSlidesEditor />
      </div>
      <div hidden={active !== 'hero-stats'}>
        <CrudManager config={heroStatsConfig} embedded />
      </div>
      <div hidden={active !== 'trust-pillars'}>
        <CrudManager config={pillarsConfig} embedded />
      </div>
      <div hidden={active !== 'testimonials'}>
        <CrudManager config={testimonialsConfig} embedded />
      </div>
      <div hidden={active !== 'hair-profiles'}>
        <CrudManager config={profilesConfig} embedded />
      </div>
    </div>
  )
}