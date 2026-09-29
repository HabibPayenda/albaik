import { useState } from 'react'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { CrudManager, type CrudConfig } from '@/components/admin/CrudManager'
import { AdminPageHeader } from '@/components/admin/AdminUI'
import { Chip } from '@/components/ui/Badge'
import type { FooterLink, NavLink, QuickLink } from '@/lib/types'

const navConfig: CrudConfig<NavLink> = {
  resource: 'navLinks',
  title: 'Header navigation',
  singular: 'Nav link',
  description: 'The primary menu shown in the site header. "Collections" also drives the mega-menu.',
  labelKey: 'label',
  searchKeys: ['label', 'path'],
  reorderable: true,
  addLabel: 'Add link',
  columns: [
    { key: 'label', label: 'Label', render: (row) => <span className="font-semibold">{row.label}</span> },
    {
      key: 'path',
      label: 'Path',
      render: (row) => <code className="rounded bg-surface-container-low px-1.5 py-0.5 font-mono text-label-sm">{row.path}</code>,
    },
    { key: 'sortOrder', label: 'Order', align: 'center' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <Chip accent={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Shown' : 'Hidden'}</Chip>,
    },
  ],
  fields: [
    { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g. Collections' },
    { name: 'path', label: 'Path', type: 'text', required: true, placeholder: '/collections' },
    { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
    { name: 'openInNewTab', label: 'Open in a new tab', type: 'bool' },
    { name: 'isActive', label: 'Show in the header', type: 'bool', span: 2 },
  ],
  defaults: { label: '', path: '/', sortOrder: 0, openInNewTab: false, isActive: true },
}

const footerConfig: CrudConfig<FooterLink> = {
  resource: 'footerLinks',
  title: 'Footer columns',
  singular: 'Footer link',
  description:
    'Footer links are grouped by the "Column" value — every distinct column name becomes its own heading.',
  labelKey: 'label',
  searchKeys: ['label', 'group', 'path'],
  reorderable: true,
  addLabel: 'Add link',
  columns: [
    {
      key: 'group',
      label: 'Column',
      render: (row) => <Chip accent="secondary">{row.group}</Chip>,
    },
    { key: 'label', label: 'Label', render: (row) => <span className="font-semibold">{row.label}</span> },
    {
      key: 'path',
      label: 'Path',
      render: (row) => <code className="rounded bg-surface-container-low px-1.5 py-0.5 font-mono text-label-sm">{row.path}</code>,
    },
    { key: 'sortOrder', label: 'Order', align: 'center' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <Chip accent={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Shown' : 'Hidden'}</Chip>,
    },
  ],
  fields: [
    { name: 'group', label: 'Column heading', type: 'text', required: true, placeholder: 'e.g. Collections' },
    { name: 'label', label: 'Link label', type: 'text', required: true },
    { name: 'path', label: 'Path', type: 'text', required: true, placeholder: '/collections/hair-care' },
    { name: 'sortOrder', label: 'Sort order', type: 'number' },
    { name: 'openInNewTab', label: 'Open in a new tab', type: 'bool' },
    { name: 'isActive', label: 'Show in the footer', type: 'bool', span: 2 },
  ],
  defaults: { group: 'Collections', label: '', path: '/', sortOrder: 0, openInNewTab: false, isActive: true },
}

const quickLinksConfig: CrudConfig<QuickLink> = {
  resource: 'quickLinks',
  title: 'Quick links',
  singular: 'Quick link',
  description:
    'The links in the mega menu\u2019s footer strip. When none are enabled here, the header falls back to its bundled defaults so the menu never looks empty.',
  labelKey: 'label',
  searchKeys: ['label', 'path'],
  reorderable: true,
  addLabel: 'Add quick link',
  columns: [
    { key: 'label', label: 'Label', render: (row) => <span className="font-semibold">{row.label}</span> },
    {
      key: 'path',
      label: 'Path',
      render: (row) => <code className="rounded bg-surface-container-low px-1.5 py-0.5 font-mono text-label-sm">{row.path}</code>,
    },
    { key: 'sortOrder', label: 'Order', align: 'center' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <Chip accent={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Shown' : 'Hidden'}</Chip>,
    },
  ],
  fields: [
    { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g. All products' },
    { name: 'path', label: 'Path', type: 'text', required: true, placeholder: '/collections' },
    { name: 'sortOrder', label: 'Sort order', type: 'number' },
    { name: 'openInNewTab', label: 'Open in a new tab', type: 'bool' },
    { name: 'isActive', label: 'Show in the mega menu', type: 'bool', span: 2 },
  ],
  defaults: { label: '', path: '/', sortOrder: 0, openInNewTab: false, isActive: true },
}

const TABS = [
  { key: 'header', label: 'Header menu', icon: 'menu' },
  { key: 'quickLinks', label: 'Quick links', icon: 'link' },
  { key: 'footer', label: 'Footer columns', icon: 'layers' },
] as const

export default function NavigationPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('header')

  return (
    <>
      <AdminPageHeader
        eyebrow="Site content"
        title="Menus & footer"
        description="Control the header navigation, the mega menu's quick links and every footer column. Changes appear on the site immediately."
      />

      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'header' ? (
        <CrudManager config={navConfig} embedded />
      ) : tab === 'quickLinks' ? (
        <CrudManager config={quickLinksConfig} embedded />
      ) : (
        <CrudManager config={footerConfig} embedded />
      )}
    </>
  )
}
