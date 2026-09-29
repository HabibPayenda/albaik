import { Fragment } from 'react'
import { Container, Section, SectionHeading } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/Reveal'
import { cn } from '@/lib/utils'
import {
  firstBlock,
  parseCmsContent,
  type ContentBlock,
  type ContentGroup,
  type ParsedContent,
  type SpecRow,
} from '@/lib/cmsContent'
import type { Page } from '@/lib/types'

type IconKey = React.ComponentProps<typeof Icon>['name']

/**
 * Four presentations for the same CMS content.
 *
 * The page picks the mode — not the other way round. Every heading, list item and
 * paragraph below is read from `Page.contentHtml`; nothing is written into the
 * component. If the CMS gains a section tomorrow it renders in the fallback style
 * rather than disappearing.
 *
 *   editorial     About — narrative, typography-led, no icons
 *   verification  Quality — specification-sheet grid plus one seal moment
 *   commercial    Distribution — opportunity cards plus a terms table
 *   plain         everything else (guides, safety, privacy, terms)
 *
 * A group may hold several blocks (Quality's "Quality Focus" group is a list *and* a
 * closing callout). Every mode therefore renders all of them and hands whatever it did
 * not consume to `Leftovers`. An earlier revision returned from the first matching
 * branch, which silently deleted the single most important sentence on the Quality
 * page — the verified-information statement.
 */
export type PageLayoutMode = 'editorial' | 'verification' | 'commercial' | 'plain'

const LAYOUTS: Record<string, PageLayoutMode> = {
  about: 'editorial',
  quality: 'verification',
  distribution: 'commercial',
}

export function layoutForSlug(slug: string): PageLayoutMode {
  return LAYOUTS[slug] ?? 'plain'
}

/* ------------------------------------------------------------------ icon maps */

/**
 * Icons are chosen by position, not by matching the copy — an admin can reword a
 * bullet without breaking the layout, and nothing here asserts a claim the sentence
 * does not already make.
 */
const VERIFICATION_ICONS: IconKey[] = [
  'inventory_2',
  'science',
  'workspace_premium',
  'verified',
  'assignment',
  'check_circle',
]
const COMMERCIAL_ICONS: IconKey[] = ['inventory_2', 'location_on', 'palette', 'assignment']

const numeral = (index: number) => String(index + 1).padStart(2, '0')

/** Blocks in `group` that the mode's bespoke treatment did not already render. */
function leftovers(group: ContentGroup, consumed: (ContentBlock | undefined)[]): ContentBlock[] {
  return group.blocks.filter(
    (block) => block.kind !== 'heading' && !consumed.includes(block),
  )
}

/* ================================================================== shared bits */

/**
 * The opening statement. Typography does the work — no card, no border.
 *
 * There is deliberately no eyebrow here: `PageHero` already prints the page's eyebrow
 * directly above, and repeating it a band later read as a mistake.
 */
function LeadBand({
  lead,
  supporting,
  tone,
}: {
  lead: string | null
  supporting: string[]
  tone: 'white' | 'surface' | 'low'
}) {
  if (!lead) return null
  return (
    <Section tone={tone}>
      <Container>
        <div className="grid gap-gutter lg:grid-cols-12">
          <Reveal className="lg:col-span-3" direction="left">
            <div className="flex lg:sticky lg:top-28">
              <span
                className="h-[2px] w-12 bg-gradient-to-b from-accent-gold to-accent-gold-deep lg:h-16 lg:w-[2px]"
                aria-hidden="true"
              />
            </div>
          </Reveal>

          <div className="flex flex-col gap-space-md lg:col-span-9">
            <Reveal>
              <p className="font-display text-headline-sm leading-snug text-on-surface md:text-headline-md lg:text-headline-lg">
                {lead}
              </p>
            </Reveal>
            {supporting.map((text) => (
              <Reveal key={text} delay={0.08}>
                <p className="max-w-3xl border-l-2 border-outline-variant/50 pl-space-md text-body-md leading-relaxed text-on-surface-variant">
                  {text}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}

/** Renders a group's blocks in the neutral house style. */
function GroupBlocks({ group }: { group: ContentGroup }) {
  return (
    <div className="flex flex-col gap-space-md">
      {group.blocks.map((block, index) => {
        if (block.kind === 'list') {
          return (
            <ul key={index} className="flex flex-col gap-space-xs">
              {block.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-space-sm text-body-md leading-relaxed text-on-surface-variant"
                >
                  <Icon name="check" size={16} className="mt-1 shrink-0 text-secondary" />
                  {item}
                </li>
              ))}
            </ul>
          )
        }
        if (block.kind === 'spec') {
          return <SpecTable key={index} rows={block.rows} />
        }
        if (block.kind === 'heading') {
          return (
            <h3 key={index} className="font-display text-headline-sm font-semibold text-on-surface">
              {block.text}
            </h3>
          )
        }
        // `lead` carries no `strong` flag, so narrow before reading it.
        const strong = (block.kind === 'prose' || block.kind === 'callout') && block.strong
        return (
          <p
            key={index}
            className={cn(
              'leading-relaxed text-on-surface-variant',
              strong ? 'text-body-md font-semibold text-on-surface' : 'text-body-md',
            )}
          >
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

function PlainGroup({ group }: { group: ContentGroup }) {
  return (
    <Section tone="surface">
      <Container size="narrow">
        {group.heading ? <SectionHeading title={group.heading} className="mb-space-md" /> : null}
        <GroupBlocks group={group} />
      </Container>
    </Section>
  )
}

/** Anything a bespoke mode did not consume, rendered so no copy is ever lost. */
function Leftovers({ blocks }: { blocks: ContentBlock[] }) {
  if (!blocks.length) return null
  return <PlainGroup group={{ heading: null, blocks }} />
}

/**
 * The closing band. Copy is deliberately the wording already shipped today — it is
 * chrome rather than a product claim, but it still wants an approved replacement
 * before go-live (see the dashboard checklist).
 */
function ClosingBand({
  mode,
  primaryCta,
}: {
  mode: PageLayoutMode
  primaryCta?: { label: string; href: string }
}) {
  const dark = mode === 'commercial'
  const cta = primaryCta ?? { label: 'Contact Albaik', href: '/contact' }
  return (
    <Section tone={dark ? 'dark' : 'surface'}>
      <Container>
        <Reveal>
          <div
            className={cn(
              'flex flex-col gap-space-lg overflow-hidden rounded-3xl border p-space-lg lg:flex-row lg:items-center lg:justify-between lg:p-space-xl',
              dark
                ? 'border-white/15 bg-white/[0.06] backdrop-blur-md'
                : 'border-outline-variant/30 bg-surface-container-lowest shadow-e1',
            )}
          >
            <div className="flex flex-col gap-space-xs">
              <span className={cn('eyebrow', dark ? 'text-accent-gold' : 'text-secondary')}>
                Next step
              </span>
              <span
                className={cn(
                  'font-display text-headline-sm font-semibold md:text-headline-md',
                  dark ? 'text-white' : 'text-on-surface',
                )}
              >
                Questions about this?
              </span>
              <span
                className={cn(
                  'max-w-xl text-body-sm leading-relaxed',
                  dark ? 'text-white/80' : 'text-on-surface-variant',
                )}
              >
                Our team can help with product, quality and wholesale enquiries.
              </span>
            </div>

            <div className="flex flex-wrap gap-space-sm">
              <ButtonLink to={cta.href} variant={dark ? 'gold' : 'primary'} icon="mail">
                {cta.label}
              </ButtonLink>
              <ButtonLink
                to="/collections"
                variant={dark ? 'glass' : 'outline'}
                iconRight="arrow_forward"
              >
                Browse products
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}

/* ============================================================= editorial (About) */

/**
 * Numbered pillars on a vertical rail. Typography-led on purpose: About is the
 * narrative page, so it stays icon-free and lets the numerals carry the rhythm.
 */
function PillarList({ items }: { items: string[] }) {
  return (
    // The rail is a sibling of the <ol>, not a child — only <li> may sit inside a list.
    <div className="relative">
      <span
        className="absolute bottom-6 left-[1.375rem] top-6 w-px bg-outline-variant/60"
        aria-hidden="true"
      />
      <Stagger as="ol" className="relative flex flex-col" delay={0.09}>
        {items.map((item, index) => (
          <StaggerItem
            as="li"
            key={item}
            className="group relative flex items-start gap-space-md py-space-md first:pt-0 last:pb-0"
          >
            <span className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border border-outline-variant/60 bg-clinical-white font-display text-label-md font-bold tabular-nums text-accent-gold-ink transition-all duration-300 group-hover:border-transparent group-hover:bg-royal-gradient-compact group-hover:text-accent-gold">
              {numeral(index)}
            </span>
            <p className="pt-2 font-display text-headline-sm font-semibold leading-snug text-on-surface transition-colors duration-300 group-hover:text-primary-container">
              {item}
            </p>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}

/** Full-width pull-quote band for the page's closing statement. */
function QuoteBand({ heading, text }: { heading: string | null; text: string }) {
  return (
    <Section tone="dark">
      <Container>
        <div className="relative mx-auto max-w-4xl text-center">
          <span
            className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 select-none font-display text-[9rem] leading-none text-accent-gold/20"
            aria-hidden="true"
          >
            &ldquo;
          </span>
          <Reveal>
            <blockquote className="relative flex flex-col items-center gap-space-md">
              <p className="font-display text-headline-sm leading-snug text-white md:text-headline-md lg:text-headline-lg">
                {text}
              </p>
              {heading ? (
                <footer className="flex items-center gap-space-sm">
                  <span className="h-px w-10 bg-accent-gold/60" aria-hidden="true" />
                  <span className="eyebrow text-accent-gold">{heading}</span>
                  <span className="h-px w-10 bg-accent-gold/60" aria-hidden="true" />
                </footer>
              ) : null}
            </blockquote>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}

function EditorialBody({ groups }: { groups: ContentGroup[] }) {
  return (
    <>
      {groups.map((group, index) => {
        const list = firstBlock(group, 'list')
        const prose = group.blocks.find((b) => b.kind === 'prose' || b.kind === 'callout')

        return (
          <Fragment key={index}>
            {list ? (
              <Section tone="low">
                <Container>
                  <div className="grid gap-gutter lg:grid-cols-12">
                    <div className="lg:col-span-4">
                      <div className="lg:sticky lg:top-28">
                        <SectionHeading eyebrow={numeral(index)} title={group.heading} />
                      </div>
                    </div>
                    <div className="lg:col-span-8">
                      <PillarList items={list.items} />
                    </div>
                  </div>
                </Container>
              </Section>
            ) : null}

            {prose ? <QuoteBand heading={group.heading} text={prose.text} /> : null}

            <Leftovers blocks={leftovers(group, [list, prose])} />
          </Fragment>
        )
      })}
    </>
  )
}

/* ========================================================== verification (Quality) */

/**
 * A hairline grid — 1px gutters over a divider-coloured backdrop. Cells are flat
 * white, so the page reads as a specification sheet rather than a set of cards.
 */
function ClinicalGrid({ items }: { items: string[] }) {
  return (
    <Stagger
      className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-outline-variant/50 bg-outline-variant/50 sm:grid-cols-2 lg:grid-cols-3"
      delay={0.07}
    >
      {items.map((item, index) => (
        <StaggerItem
          key={item}
          className="group flex flex-col gap-space-md bg-clinical-white p-space-lg transition-colors duration-300 hover:bg-water-foam"
        >
          <div className="flex items-center justify-between">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-water-foam text-primary-container transition-colors duration-300 group-hover:bg-royal-gradient-compact group-hover:text-accent-gold">
              <Icon name={VERIFICATION_ICONS[index] ?? 'check_circle'} size={22} />
            </span>
            <span className="font-display text-label-md font-bold tabular-nums tracking-[0.2em] text-accent-gold-ink">
              {numeral(index)}
            </span>
          </div>
          <p className="font-display text-headline-sm font-semibold leading-snug text-on-surface">
            {item}
          </p>
        </StaggerItem>
      ))}
    </Stagger>
  )
}

/** The verification seal — the page's one loud moment. */
function SealBand({ text }: { text: string }) {
  return (
    <Section tone="dark">
      <Container>
        <div className="grid items-center gap-gutter lg:grid-cols-12">
          <Reveal className="lg:col-span-3" direction="left">
            <div className="flex justify-center lg:justify-start">
              <div className="relative flex size-32 items-center justify-center rounded-full border border-accent-gold/40">
                <span
                  className="absolute inset-[7px] rounded-full border border-dashed border-accent-gold/30"
                  aria-hidden="true"
                />
                <Icon name="verified_user" size={44} className="relative text-accent-gold" />
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-space-sm lg:col-span-9">
            <Reveal>
              <span className="eyebrow text-accent-gold">Publication standard</span>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="font-display text-headline-sm leading-snug text-white md:text-headline-md">
                {text}
              </p>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  )
}

function VerificationBody({ groups }: { groups: ContentGroup[] }) {
  return (
    <>
      {groups.map((group, index) => {
        const list = firstBlock(group, 'list')
        const callout = firstBlock(group, 'callout')

        return (
          <Fragment key={index}>
            {list ? (
              <Section tone="low">
                <Container>
                  <SectionHeading title={group.heading} className="mb-space-lg" />
                  <ClinicalGrid items={list.items} />
                </Container>
              </Section>
            ) : null}

            {callout ? <SealBand text={callout.text} /> : null}

            <Leftovers blocks={leftovers(group, [list, callout])} />
          </Fragment>
        )
      })}
    </>
  )
}

/* ======================================================== commercial (Distribution) */

function DistributorCards({ items }: { items: string[] }) {
  return (
    <Stagger className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4" delay={0.08}>
      {items.map((item, index) => (
        <StaggerItem
          key={item}
          className="group relative flex flex-col gap-space-md overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:border-accent-gold/50 hover:shadow-e3"
        >
          <span
            className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gold-gradient transition-transform duration-300 group-hover:scale-x-100"
            aria-hidden="true"
          />
          <span className="flex size-14 items-center justify-center rounded-2xl bg-royal-gradient-compact text-accent-gold shadow-e1">
            <Icon name={COMMERCIAL_ICONS[index] ?? 'inventory_2'} size={24} />
          </span>
          <p className="font-display text-headline-sm font-semibold leading-snug text-on-surface">
            {item}
          </p>
          <span className="mt-auto font-display text-label-md font-bold tabular-nums tracking-[0.2em] text-on-surface-variant">
            {numeral(index)}
          </span>
        </StaggerItem>
      ))}
    </Stagger>
  )
}

/** `Label: value` rows rendered as a commercial terms sheet. */
function SpecTable({ rows }: { rows: SpecRow[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-outline-variant/40 bg-clinical-white shadow-e1">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={cn(
            'group relative grid gap-space-xs px-space-lg py-space-md transition-colors duration-300 hover:bg-surface-container-low sm:grid-cols-12 sm:items-baseline sm:gap-space-md',
            index > 0 && 'border-t border-outline-variant/40',
          )}
        >
          <span
            className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-gold-gradient transition-transform duration-300 group-hover:scale-y-100"
            aria-hidden="true"
          />
          <dt className="font-display text-headline-sm font-semibold text-on-surface sm:col-span-5">
            {row.label}
          </dt>
          <dd className="text-body-md text-on-surface-variant first-letter:uppercase sm:col-span-7">
            {row.value}
          </dd>
        </div>
      ))}
    </div>
  )
}

function CommercialBody({ groups }: { groups: ContentGroup[] }) {
  return (
    <>
      {groups.map((group, index) => {
        const list = firstBlock(group, 'list')
        const spec = firstBlock(group, 'spec')

        return (
          <Fragment key={index}>
            {spec ? (
              <Section tone="white">
                <Container>
                  <SectionHeading title={group.heading} className="mb-space-lg" />
                  <SpecTable rows={spec.rows} />
                </Container>
              </Section>
            ) : null}

            {list ? (
              <Section tone="low">
                <Container>
                  <SectionHeading title={group.heading} className="mb-space-lg" />
                  <DistributorCards items={list.items} />
                </Container>
              </Section>
            ) : null}

            <Leftovers blocks={leftovers(group, [spec, list])} />
          </Fragment>
        )
      })}
    </>
  )
}

/* ================================================================ plain (guides…) */

/**
 * One readable column, no editorial offset, no alternating bands.
 *
 * These pages are guides and legal text — the content is a lead line followed by a
 * single list. The offset two-column lead that About uses left most of the page empty
 * here, and splitting the lead into its own band put a `space-xl` gap between the
 * sentence and the list it introduces.
 */
function PlainBody({
  lead,
  supporting,
  groups,
}: {
  lead: string | null
  supporting: string[]
  groups: ContentGroup[]
}) {
  return (
    <Section tone="surface">
      <Container size="narrow">
        <div className="flex flex-col gap-space-lg">
          {lead ? (
            <div className="flex flex-col gap-space-sm">
              <span
                className="h-[2px] w-12 bg-gradient-to-r from-accent-gold to-accent-gold-deep"
                aria-hidden="true"
              />
              <p className="font-display text-headline-sm font-semibold leading-snug text-on-surface md:text-headline-md">
                {lead}
              </p>
            </div>
          ) : null}

          {supporting.map((text) => (
            <p key={text} className="text-body-md leading-relaxed text-on-surface-variant">
              {text}
            </p>
          ))}

          {groups.map((group, index) => (
            <div key={index} className="flex flex-col gap-space-md">
              {group.heading ? (
                <h2 className="font-display text-headline-sm font-semibold text-on-surface md:text-headline-md">
                  {group.heading}
                </h2>
              ) : null}
              <GroupBlocks group={group} />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

/* ======================================================================== export */

export function StructuredPage({ page, mode }: { page: Page; mode: PageLayoutMode }) {
  const parsed: ParsedContent = parseCmsContent(page.contentHtml)

  /*
   * Split the content that sits before the first heading.
   *
   * Orphan *prose* reads as a supporting paragraph under the lead — that is About's
   * second paragraph. Everything else is real body content and MUST still be rendered:
   * shampoo-guide, safety and how-to-use are nothing but an orphan `<ul>` with no
   * headings anywhere, so filtering groups down to `heading !== null` deleted the whole
   * body of three pages while leaving them looking perfectly fine.
   */
  const supporting: string[] = []
  const bodyGroups: ContentGroup[] = []
  for (const group of parsed.groups) {
    // A group with a heading is body content, always.
    // A group WITHOUT one can only be "supporting" if there is a lead to support —
    // `LeadBand` renders it, and `LeadBand` bails out when `lead` is null. Safety has
    // no lead paragraph (it opens with a list), so lifting its trailing paragraph into
    // `supporting` deleted it outright.
    if (group.heading !== null || parsed.lead === null) {
      bodyGroups.push(group)
      continue
    }
    supporting.push(
      ...group.blocks.filter((b) => b.kind === 'prose').map((b) => (b as { text: string }).text),
    )
    const rest = group.blocks.filter((b) => b.kind !== 'prose')
    if (rest.length) bodyGroups.push({ heading: null, blocks: rest })
  }

  // Nothing recognisable in the CMS content — show the words rather than an empty page.
  if (!parsed.blocks.length) {
    return (
      <Section tone="surface">
        <Container size="narrow">
          <p className="text-body-md text-on-surface-variant">
            This page has no published content yet.
          </p>
        </Container>
      </Section>
    )
  }

  const primaryCta =
    page.slug === 'distribution'
      ? { label: 'Become a distributor', href: '/contact?topic=wholesale' }
      : undefined

  // `plain` keeps the lead inside its single column; the bespoke modes use LeadBand.
  if (mode === 'plain') {
    return (
      <>
        <PlainBody lead={parsed.lead} supporting={supporting} groups={bodyGroups} />
        <ClosingBand mode={mode} primaryCta={primaryCta} />
      </>
    )
  }

  return (
    <>
      <LeadBand
        lead={parsed.lead}
        supporting={supporting}
        tone={mode === 'verification' ? 'surface' : 'white'}
      />

      {mode === 'editorial' ? <EditorialBody groups={bodyGroups} /> : null}
      {mode === 'verification' ? <VerificationBody groups={bodyGroups} /> : null}
      {mode === 'commercial' ? <CommercialBody groups={bodyGroups} /> : null}

      <ClosingBand mode={mode} primaryCta={primaryCta} />
    </>
  )
}
