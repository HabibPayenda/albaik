import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { CollapsibleMessageBody } from '@/components/admin/CollapsibleMessageBody'
import { KIND_ACCENT, KIND_LABEL } from '@/lib/messageMeta'
import type { ContactMessage, ContactMessageReply } from '@/lib/types'
import { cn, formatLocalDateTime, initials, localTimeZone } from '@/lib/utils'

interface Props {
  message: ContactMessage | null
  replies: ContactMessageReply[]
  repliesLoading: boolean
  onClose: () => void
  onReply: (message: ContactMessage) => void
  onAskDelete: (message: ContactMessage) => void
  onToggleRead: (message: ContactMessage) => void
  onCopyEmail: (email: string) => void
  onWhatsApp: (phone: string) => void
}

export function MessageDetailModal({
  message,
  replies,
  repliesLoading,
  onClose,
  onReply,
  onAskDelete,
  onToggleRead,
  onCopyEmail,
  onWhatsApp,
}: Props) {
  if (!message) return null

  const zone = localTimeZone()
  const kind = KIND_LABEL[message.kind] ?? message.kind
  const totalMessages = replies.length + 1

  return (
    <Modal
      open
      onClose={onClose}
      title={`Message from ${message.name}`}
      size="xl"
      className="overflow-hidden"
      bodyClassName="p-0"
      header={<MessageHeader message={message} kind={kind} onClose={onClose} />}
      footer={
        <>
          <Button
            variant="danger"
            icon="delete"
            onClick={() => onAskDelete(message)}
            className="mr-auto"
          >
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon="mail" onClick={() => onReply(message)}>
            Reply by email
          </Button>
        </>
      }
    >
      <div className="grid gap-space-lg bg-surface-container-lowest p-space-lg lg:grid-cols-[minmax(0,1fr)_320px] lg:p-space-xl">
        <section className="min-w-0">
          <div className="mb-space-md flex flex-wrap items-end justify-between gap-2 border-b border-outline-variant/40 pb-space-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent-gold-ink">
                Conversation
              </p>
              <h3 className="mt-1 font-display text-headline-sm font-semibold text-on-surface">
                {totalMessages} {totalMessages === 1 ? 'message' : 'messages'}
              </h3>
            </div>
            <p className="text-label-sm text-on-surface-variant">
              Times in {zone ?? 'your local timezone'}
            </p>
          </div>

          <div className="flex flex-col gap-space-md">
            <article className="rounded-2xl border border-outline-variant/40 bg-clinical-white p-space-md shadow-e1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={initials(message.name) || '?'} tone="customer" />
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-on-surface">{message.name}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      Website enquiry · {formatLocalDateTime(message.createdAt, undefined)}
                    </p>
                  </div>
                </div>
                <Chip accent={KIND_ACCENT[message.kind] ?? 'neutral'}>{kind}</Chip>
              </div>
              <div className="mt-space-sm border-t border-outline-variant/30 pt-space-sm">
                <CollapsibleMessageBody text={message.message} />
              </div>
            </article>

            {repliesLoading ? (
              <div className="skeleton h-28 w-full rounded-2xl" />
            ) : null}

            {replies.map((reply) => {
              const isCustomer = reply.source === 'customer'
              const isPhone = reply.source === 'phone'

              return (
                <article
                  key={reply.id}
                  className={cn(
                    'relative rounded-2xl border p-space-md shadow-e1',
                    isCustomer
                      ? 'border-accent-gold/35 bg-[#fffdf5]'
                      : 'border-secondary/20 bg-clinical-white',
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-0 top-space-md h-8 w-[3px] rounded-r-full',
                      isCustomer ? 'bg-accent-gold' : 'bg-secondary',
                    )}
                  />
                  <div className="flex items-start justify-between gap-3 pl-space-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        initials={isCustomer ? initials(message.name) || '?' : 'A'}
                        tone={isCustomer ? 'customer' : 'brand'}
                      />
                      <div className="min-w-0">
                        <p className="text-body-sm font-semibold text-on-surface">
                          {isCustomer ? 'Customer reply' : 'Your reply'}
                        </p>
                        <p className="text-label-sm text-on-surface-variant">
                          {formatLocalDateTime(reply.sentAt, undefined)} ·{' '}
                          {isCustomer
                            ? 'Received from the customer'
                            : isPhone
                              ? 'Synchronised from your email app'
                              : 'Sent from the dashboard'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                        isCustomer
                          ? 'bg-accent-gold/15 text-accent-gold-ink'
                          : 'bg-secondary/10 text-secondary',
                      )}
                    >
                      {isCustomer ? 'Inbound' : 'Outbound'}
                    </span>
                  </div>

                  <div className="mt-space-sm border-t border-outline-variant/30 pt-space-sm">
                    <p className="mb-2 text-label-md font-semibold text-on-surface">{reply.subject}</p>
                    <CollapsibleMessageBody text={reply.body} />
                    <p className="mt-space-sm text-label-sm text-on-surface-variant/75">
                      {isCustomer ? 'From' : 'To'} {reply.toAddress}
                    </p>
                  </div>
                </article>
              )
            })}

            {!repliesLoading && replies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low/40 px-space-md py-space-lg text-center">
                <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-clinical-white text-secondary shadow-e1">
                  <Icon name="mail" size={18} />
                </span>
                <p className="mt-3 text-body-sm font-semibold text-on-surface">No replies yet</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Reply from the dashboard, or let the mailbox sync add the customer&apos;s answer here.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="flex flex-col gap-space-md">
          <section className="rounded-2xl border border-outline-variant/40 bg-clinical-white p-space-md shadow-e1">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent-gold-ink">
              Contact
            </p>
            <div className="mt-space-sm flex items-center gap-3">
              <Avatar initials={initials(message.name) || '?'} tone="customer" large />
              <div className="min-w-0">
                <p className="truncate font-display text-headline-sm font-semibold text-on-surface">
                  {message.name}
                </p>
                <p className="truncate text-body-sm text-on-surface-variant">{message.email}</p>
              </div>
            </div>

            <dl className="mt-space-md flex flex-col">
              {[
                ['Type', kind],
                ['Subject', message.subject ?? '—'],
                ['Company', message.company ?? '—'],
                ['Phone', message.phone ?? '—'],
                ['Received', formatLocalDateTime(message.createdAt)],
                [
                  'Email delivery',
                  message.emailDelivered ? 'Delivered to your inbox' : 'Not delivered — see settings',
                ],
                [
                  'Your replies',
                  message.replyCount > 0
                    ? `${message.replyCount} · ${formatLocalDateTime(message.repliedAt!)}`
                    : 'None yet',
                ],
                [
                  'Customer replies',
                  message.customerReplyCount > 0
                    ? `${message.customerReplyCount} · ${formatLocalDateTime(message.lastCustomerReplyAt!)}`
                    : 'None yet',
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-3 border-b border-outline-variant/30 py-2.5 last:border-0"
                >
                  <dt className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
                    {label}
                  </dt>
                  <dd className="max-w-[62%] break-words text-right text-body-sm text-on-surface">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {!message.emailDelivered && message.deliveryError ? (
            <div className="flex items-start gap-2 rounded-2xl border border-error-container bg-error-container/40 p-space-sm">
              <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-error" />
              <p className="text-body-sm text-on-error-container">{message.deliveryError}</p>
            </div>
          ) : null}

          <section className="rounded-2xl border border-outline-variant/40 bg-clinical-white p-space-md shadow-e1">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent-gold-ink">
              Actions
            </p>
            <div className="mt-space-sm flex flex-col gap-2">
              <Button variant="outline" icon="copy" block onClick={() => onCopyEmail(message.email)}>
                Copy email
              </Button>
              {message.phone ? (
                <Button
                  variant="outline"
                  icon="whatsapp"
                  block
                  onClick={() => onWhatsApp(message.phone!)}
                >
                  WhatsApp
                </Button>
              ) : null}
              <Button
                variant="subtle"
                icon={message.isRead ? 'visibility' : 'check'}
                block
                onClick={() => onToggleRead(message)}
              >
                Mark as {message.isRead ? 'unread' : 'read'}
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </Modal>
  )
}

function MessageHeader({
  message,
  kind,
  onClose,
}: {
  message: ContactMessage
  kind: string
  onClose: () => void
}) {
  return (
    <header className="relative overflow-hidden bg-royal-gradient px-space-lg py-space-lg sm:px-space-xl">
      <span className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full border border-white/10" />
      <span className="pointer-events-none absolute -bottom-28 -left-12 size-56 rounded-full bg-white/[0.03]" />

      <div className="relative flex items-start justify-between gap-space-md">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-accent-gold/50 bg-white/10 font-display text-headline-sm font-bold text-accent-gold shadow-e1">
            {initials(message.name) || '?'}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-accent-gold">
              Customer enquiry
            </p>
            <h2 className="mt-1 truncate font-display text-[28px] font-semibold leading-tight text-white">
              {message.name}
            </h2>
            <p className="mt-1 truncate text-body-sm text-white/65">
              {message.email}
              {message.company ? ` · ${message.company}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close message"
          className="rounded-full border border-white/15 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="relative mt-space-md flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/85">
          {kind}
        </span>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
            message.isRead
              ? 'border border-white/15 bg-white/5 text-white/65'
              : 'bg-accent-gold text-[#201a06]',
          )}
        >
          {message.isRead ? 'Read' : 'New'}
        </span>
        {message.replyCount > 0 ? (
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
            Replied
          </span>
        ) : null}
        {message.customerReplyCount > 0 ? (
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
            Customer replied
          </span>
        ) : null}
        <span className="ml-auto text-label-sm text-white/55">
          {formatLocalDateTime(message.createdAt)}
        </span>
      </div>
    </header>
  )
}

function Avatar({
  initials: text,
  tone,
  large = false,
}: {
  initials: string
  tone: 'customer' | 'brand'
  large?: boolean
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border font-display font-bold',
        large ? 'size-11 text-body-md' : 'size-9 text-label-md',
        tone === 'customer'
          ? 'border-accent-gold/40 bg-accent-gold/10 text-accent-gold-ink'
          : 'border-secondary/30 bg-royal-gradient-compact text-white',
      )}
    >
      {text}
    </span>
  )
}
