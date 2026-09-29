/**
 * Turns the CMS `Page.contentHtml` blob into structured blocks.
 *
 * Why this exists: every content page used to render its HTML through a `prose-albaik`
 * class that was never actually defined in CSS, so About / Quality / Distribution fell
 * back to browser-default headings and bullets and ended up looking identical. Rather
 * than hardcode three page layouts, we read the *shape* of the CMS content and let each
 * page choose a presentation for that shape.
 *
 * The parser is deliberately pure data — no React, no HTML strings out. It reads text
 * content only, which also makes it strictly safer than the `dangerouslySetInnerHTML`
 * it replaces.
 *
 * Recognised shapes:
 *   lead      the opening paragraph, before any heading
 *   heading   <h2> / <h3>
 *   list      <ul> / <ol> whose items are plain phrases
 *   spec      <ul> whose items are all `Label: value` — rendered as a spec table
 *   callout   a paragraph that is entirely <strong>, or a <blockquote>
 *   prose     anything else
 */

export type ContentBlockKind = 'lead' | 'heading' | 'prose' | 'list' | 'spec' | 'callout'

export interface SpecRow {
  label: string
  value: string
}

/**
 * A discriminated union rather than one wide interface with optional fields — that is
 * what lets `firstBlock(group, 'list')` narrow to a block that definitely has `items`.
 */
export type ContentBlock =
  | { kind: 'lead'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'prose'; text: string; strong?: boolean }
  | { kind: 'callout'; text: string; strong?: boolean }
  | { kind: 'list'; items: string[] }
  | { kind: 'spec'; rows: SpecRow[] }

/** A heading plus everything under it, up to the next heading. */
export interface ContentGroup {
  heading: string | null
  blocks: ContentBlock[]
}

export interface ParsedContent {
  /** The opening paragraph, lifted out of the group flow. */
  lead: string | null
  groups: ContentGroup[]
  /** Flat list of every block, in order — used by the generic fallback renderer. */
  blocks: ContentBlock[]
}

/** `Label: value` — used to promote a list into a spec table. */
const SPEC_ROW = /^([^:]{2,64}):\s*(\S.*)$/

const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()

function listItems(list: Element): string[] {
  return Array.from(list.querySelectorAll(':scope > li'))
    .map((li) => clean(li.textContent))
    .filter(Boolean)
}

/** Only promote to `spec` when *every* row parses — one stray colon must not win. */
function asSpecRows(items: string[]): SpecRow[] | null {
  if (items.length < 2) return null
  const rows: SpecRow[] = []
  for (const item of items) {
    const match = SPEC_ROW.exec(item)
    if (!match) return null
    rows.push({ label: clean(match[1]), value: clean(match[2]) })
  }
  return rows
}

/** A paragraph is a callout when nothing sits outside its <strong>/<b> wrapper. */
function isFullyStrong(el: Element): boolean {
  const text = clean(el.textContent)
  if (!text) return false
  const strongText = Array.from(el.querySelectorAll('strong, b'))
    .map((s) => clean(s.textContent))
    .join(' ')
  return clean(strongText) === text
}

function blockFromElement(el: Element): ContentBlock | null {
  const tag = el.tagName.toLowerCase()

  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
    const text = clean(el.textContent)
    return text ? { kind: 'heading', text } : null
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = listItems(el)
    if (!items.length) return null
    const rows = asSpecRows(items)
    return rows ? { kind: 'spec', rows } : { kind: 'list', items }
  }

  if (tag === 'blockquote') {
    const text = clean(el.textContent)
    return text ? { kind: 'callout', text, strong: true } : null
  }

  if (tag === 'p' || tag === 'div') {
    const text = clean(el.textContent)
    if (!text) return null
    return isFullyStrong(el) ? { kind: 'callout', text, strong: true } : { kind: 'prose', text }
  }

  // Tables, figures and anything else the CMS might grow later: keep the words.
  const text = clean(el.textContent)
  return text ? { kind: 'prose', text } : null
}

/** Pull the parsed document's top-level blocks in source order. */
function readBlocks(html: string): ContentBlock[] {
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') return []

  const doc = new window.DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html')
  const root = doc.getElementById('root')
  if (!root) return []

  const blocks: ContentBlock[] = []
  for (const child of Array.from(root.children)) {
    const block = blockFromElement(child)
    if (block) blocks.push(block)
  }

  // Content with no markup at all — treat the whole thing as one paragraph.
  if (!blocks.length) {
    const text = clean(root.textContent)
    if (text) blocks.push({ kind: 'prose', text })
  }

  return blocks
}

export function parseCmsContent(html: string | null | undefined): ParsedContent {
  const blocks = readBlocks(html ?? '')

  // The opening paragraph, before any heading, becomes the lead.
  let lead: string | null = null
  let cursor = 0
  const first = blocks[0]
  if (first && first.kind === 'prose') {
    lead = first.text
    cursor = 1
  }

  const groups: ContentGroup[] = []
  let current: ContentGroup | null = null

  for (const block of blocks.slice(cursor)) {
    if (block.kind === 'heading') {
      current = { heading: block.text, blocks: [] }
      groups.push(current)
      continue
    }
    if (!current) {
      current = { heading: null, blocks: [] }
      groups.push(current)
    }
    current.blocks.push(block)
  }

  return { lead, groups, blocks }
}

export type BlockOfKind<K extends ContentBlockKind> = Extract<ContentBlock, { kind: K }>

/** First group whose heading matches, case- and punctuation-insensitively. */
export function findGroup(groups: ContentGroup[], heading: string): ContentGroup | undefined {
  const needle = heading.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return groups.find(
    (g) => (g.heading ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === needle,
  )
}

/** First block of a given kind inside a group, narrowed to that kind. */
export function firstBlock<K extends ContentBlockKind>(
  group: ContentGroup | undefined,
  kind: K,
): BlockOfKind<K> | undefined {
  const found = group?.blocks.find((b) => b.kind === kind)
  return found as BlockOfKind<K> | undefined
}
