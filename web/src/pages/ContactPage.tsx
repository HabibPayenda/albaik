import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { resetContact, submitContact } from '@/store/uiSlice'
import { fetchProduct } from '@/store/catalogSlice'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Container, PageHero, Section } from '@/components/ui/Layout'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Button, ButtonAnchor } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { EASE } from '@/lib/motion'
import { mapEmbedSrc } from '@/lib/mapEmbed'
import { cn } from '@/lib/utils'

interface FormState {
  name: string
  email: string
  phone: string
  company: string
  subject: string
  message: string
  kind: string
  website: string
}

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  subject: '',
  message: '',
  kind: 'contact',
  website: '',
}

/**
 * Contact / enquiry form.
 *
 * Reached three ways, and the page adapts to each:
 *
 *   /contact                                  general enquiry
 *   /contact?topic=wholesale                  distribution & wholesale
 *   /contact?topic=product&product=<slug>     from "Enquire about this product"
 *
 * The third is the one that used to lose information. The product page linked here with
 * `topic=wholesale` and nothing else, so the enquiry arrived with no indication of which
 * product it concerned. Now the slug is resolved against the catalogue, shown as a
 * removable context card above the form, and sent with the submission — the API looks the
 * name up itself, so the notification email names the product without the client being
 * able to assert one.
 */
export function ContactPage() {
  const dispatch = useAppDispatch()
  const settings = useSiteSettings()
  const { contactStatus, contactError } = useAppSelector((state) => state.ui)
  const product = useAppSelector((state) => state.catalog.product)
  const [params, setParams] = useSearchParams()
  const [form, setForm] = useState<FormState>(EMPTY)

  const isWholesale = params.get('topic') === 'wholesale'
  const productSlug = params.get('product') ?? ''
  const isProductEnquiry = Boolean(productSlug) && !isWholesale

  // Accepts either the embed URL or Google's whole `<iframe>` snippet — see the helper.
  const mapSrc = mapEmbedSrc(settings.mapEmbed)

  useDocumentTitle(
    isProductEnquiry ? `Product enquiry — ${settings.siteName}` : `Contact — ${settings.siteName}`,
  )

  // Resolve the slug so the context card can name the product.
  useEffect(() => {
    if (productSlug) dispatch(fetchProduct(productSlug))
  }, [productSlug, dispatch])

  const defaultKind = isWholesale ? 'wholesale' : isProductEnquiry ? 'product' : 'contact'

  useEffect(() => {
    setForm((prev) => ({ ...prev, kind: defaultKind }))
    dispatch(resetContact())
  }, [defaultKind, dispatch])

  useEffect(() => {
    if (contactStatus === 'success') setForm({ ...EMPTY, kind: defaultKind })
  }, [contactStatus, defaultKind])

  const set =
    (key: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    dispatch(submitContact({ ...form, productSlug: productSlug || undefined }))
  }

  /** Drop the product context and return to a plain enquiry, without a page reload. */
  const clearProduct = () => {
    const next = new URLSearchParams(params)
    next.delete('product')
    next.delete('topic')
    setParams(next, { replace: true })
  }

  const channels = [
    settings.address && { icon: 'location_on', label: 'Head office', value: settings.address, href: undefined },
    settings.phone && { icon: 'phone', label: 'Phone', value: settings.phone, href: `tel:${settings.phone}` },
    settings.email && { icon: 'mail', label: 'Email', value: settings.email, href: `mailto:${settings.email}` },
    settings.hours && { icon: 'schedule', label: 'Opening hours', value: settings.hours, href: undefined },
  ].filter(Boolean) as { icon: string; label: string; value: string; href?: string }[]

  return (
    <>
      <PageHero
        eyebrow={isWholesale ? 'Wholesale & distribution' : isProductEnquiry ? 'Product enquiry' : 'Get in touch'}
        title={isWholesale ? 'Wholesale Enquiry' : isProductEnquiry ? 'Enquire About a Product' : 'Contact Albaik'}
        subtitle={
          isWholesale
            ? 'Tell us about your business, territory and the products you would like to stock. Minimum order quantity and pricing are available on request.'
            : isProductEnquiry
              ? 'Send us your question about this product and the Albaik team will respond. Include quantities or your business details if you are enquiring about supply.'
              : 'For product inquiries, wholesale orders, distribution opportunities and business cooperation, please contact Albaik Group of Companies.'
        }
      />

      <Section tone="surface">
        <Container>
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
            {/* --------------------------------------------------------- form */}
            <Reveal className="lg:col-span-7" direction="left">
              <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-e1">
                <h2 className="font-display text-headline-md font-semibold text-on-surface">
                  {isWholesale ? 'Tell us about your business' : 'Send us a message'}
                </h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Fields marked with <span className="text-error">*</span> are required. We usually respond within one
                  working day.
                </p>

                {/* ------------------------------------------- product context */}
                {isProductEnquiry ? (
                  <div className="mt-space-md flex items-start gap-space-sm rounded-2xl border border-accent-gold/35 bg-accent-gold/8 p-space-sm">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-accent-gold-ink">
                      <Icon name="spa" size={17} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-label-sm font-bold uppercase tracking-wider text-accent-gold-ink">
                        Regarding this product
                      </span>
                      <span className="truncate font-display text-headline-sm font-semibold text-on-surface">
                        {product?.slug === productSlug ? product.name : 'Loading product…'}
                      </span>
                      {product?.slug === productSlug ? (
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-on-surface-variant">
                          {product.brandName ? <span>{product.brandName}</span> : null}
                          {product.size ? <span>· {product.size}</span> : null}
                          <Link
                            to={`/products/${productSlug}`}
                            className="inline-flex items-center gap-1 font-semibold text-secondary hover:text-primary"
                          >
                            View product
                            <Icon name="arrow_forward" size={12} />
                          </Link>
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={clearProduct}
                      aria-label="Remove product from this enquiry"
                      className="shrink-0 rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : null}

                <form onSubmit={onSubmit} className="mt-space-md flex flex-col gap-space-md">
                  <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                    <Field label={settings.text('labels.contact.fullName', 'Full name')} required htmlFor="contact-name">
                      <TextInput
                        id="contact-name"
                        value={form.name}
                        onChange={set('name')}
                        required
                        autoComplete="name"
                        placeholder="Your name"
                      />
                    </Field>

                    <Field label={settings.text('labels.contact.email', 'Email address')} required htmlFor="contact-email">
                      <TextInput
                        id="contact-email"
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        required
                        autoComplete="email"
                        placeholder="you@company.com"
                      />
                    </Field>

                    <Field label={settings.text('labels.contact.phone', 'Phone / WhatsApp')} htmlFor="contact-phone">
                      <TextInput
                        id="contact-phone"
                        value={form.phone}
                        onChange={set('phone')}
                        autoComplete="tel"
                        placeholder="+93 …"
                      />
                    </Field>

                    <Field label={settings.text('labels.contact.company', 'Company / shop')} htmlFor="contact-company">
                      <TextInput
                        id="contact-company"
                        value={form.company}
                        onChange={set('company')}
                        autoComplete="organization"
                        placeholder="Business name"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                    <Field label={settings.text('labels.contact.enquiryType', 'Enquiry type')} htmlFor="contact-kind">
                      <Select id="contact-kind" value={form.kind} onChange={set('kind')}>
                        <option value="contact">General enquiry</option>
                        <option value="product">Product enquiry</option>
                        <option value="wholesale">Wholesale / distribution</option>
                      </Select>
                    </Field>

                    <Field label={settings.text('labels.contact.subject', 'Subject')} htmlFor="contact-subject">
                      <TextInput
                        id="contact-subject"
                        value={form.subject}
                        onChange={set('subject')}
                        placeholder={isProductEnquiry && product ? `Enquiry: ${product.name}` : 'What is this about?'}
                      />
                    </Field>
                  </div>

                  <Field
                    label={settings.text('labels.contact.message', 'Message')}
                    required
                    htmlFor="contact-message"
                    hint="Include product names, quantities or territories where relevant."
                  >
                    <TextArea
                      id="contact-message"
                      rows={6}
                      value={form.message}
                      onChange={set('message')}
                      required
                      placeholder="How can we help?"
                    />
                  </Field>

                  {/* Honeypot — hidden from humans, irresistible to bots */}
                  <div className="absolute -left-[9999px]" aria-hidden="true">
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={set('website')}
                    />
                  </div>

                  {contactStatus === 'error' && contactError ? (
                    <div className="flex items-start gap-2 rounded-xl border border-error-container bg-error-container/50 p-space-sm">
                      <Icon name="error" size={17} className="mt-0.5 shrink-0 text-error" />
                      <p className="text-body-sm text-on-error-container">{contactError}</p>
                    </div>
                  ) : null}

                  {contactStatus === 'success' ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="flex items-start gap-2 rounded-xl border border-marine/25 bg-marine/8 p-space-sm"
                    >
                      <Icon name="check_circle" size={17} className="mt-0.5 shrink-0 text-marine" />
                      <p className="text-body-sm text-on-surface">
                        Thank you — your message has been received. The Albaik team will respond shortly.
                      </p>
                    </motion.div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-space-sm">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      icon="mail"
                      loading={contactStatus === 'loading'}
                    >
                      {settings.text(
                        'labels.contact.submit',
                        isWholesale ? 'Send wholesale enquiry' : isProductEnquiry ? 'Send product enquiry' : 'Send message',
                      )}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setForm({ ...EMPTY, kind: form.kind })}>
                      Clear form
                    </Button>
                  </div>
                </form>
              </div>
            </Reveal>

            {/* ------------------------------------------------------ details */}
            <div className="flex flex-col gap-space-md lg:col-span-5">
              <Reveal direction="right">
                <div className="flex flex-col gap-space-md rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-space-lg shadow-e1">
                  <h2 className="font-display text-headline-sm font-semibold text-on-surface">
                    Contact details
                  </h2>

                  <ul className="flex flex-col gap-space-sm">
                    {channels.map((channel) => (
                      <li key={channel.label} className="flex items-start gap-space-sm">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-secondary">
                          <Icon name={channel.icon} size={17} />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
                            {channel.label}
                          </span>
                          {channel.href ? (
                            <a
                              href={channel.href}
                              className="text-body-sm text-on-surface transition-colors hover:text-secondary"
                            >
                              {channel.value}
                            </a>
                          ) : (
                            <span className="text-body-sm text-on-surface">{channel.value}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-space-sm border-t border-outline-variant/40 pt-space-md">
                    {settings.whatsapp ? (
                      <ButtonAnchor
                        href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        variant="success"
                        icon="whatsapp"
                      >
                        WhatsApp us
                      </ButtonAnchor>
                    ) : null}
                    {settings.email ? (
                      <ButtonAnchor href={`mailto:${settings.email}`} variant="outline" icon="mail">
                        Email
                      </ButtonAnchor>
                    ) : null}
                  </div>
                </div>
              </Reveal>

              <Reveal direction="right" delay={0.08}>
                <div className="rounded-3xl border border-white/10 bg-royal-gradient p-space-lg text-white shadow-e2">
                  <span className="eyebrow text-accent-gold">Distributors & retailers</span>
                  <h3 className="mt-2 font-display text-headline-sm font-semibold">
                    Partner with Albaik Group
                  </h3>
                  <ul className="mt-3 flex flex-col gap-2 text-body-sm text-white/85">
                    {[
                      'Product availability and wholesale supply',
                      'Territory-based distribution opportunities',
                      'Marketing and product-support materials',
                      'Commercial terms according to approved company policy',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Icon name="check_circle" size={15} className="mt-0.5 shrink-0 text-accent-gold" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-space-md">
                    <Button
                      variant="gold"
                      icon="assignment"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          kind: 'wholesale',
                          subject: prev.subject || 'Wholesale / distribution enquiry',
                        }))
                      }
                      className={cn('w-full')}
                    >
                      Switch to wholesale enquiry
                    </Button>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Full-width location band: kept out of the right-hand column so the map
                does not stretch it past the form and leave dead space beside the
                partner card. */}
            {mapSrc ? (
              <Reveal className="lg:col-span-12" direction="up" delay={0.08}>
                <div className="overflow-hidden rounded-3xl border border-outline-variant/30 shadow-e1">
                  <iframe
                    title="Albaik head office location"
                    src={mapSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-64 w-full border-0 lg:h-80"
                  />
                </div>
              </Reveal>
            ) : null}
          </div>
        </Container>
      </Section>
    </>
  )
}
