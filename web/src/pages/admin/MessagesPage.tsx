import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { deleteResource, loadMessages, markMessageRead } from '@/store/adminSlice'
import { pushToast } from '@/store/uiSlice'
import { AdminCard, AdminPageHeader, AdminToolbar } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field'
import { Chip, type Accent } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/Feedback'
import { api, endpoints, errorMessage } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { EASE } from '@/lib/motion'
import type { ContactMessage } from '@/lib/types'

const KIND_LABEL: Record<string, string> = {
  contact: 'General',
  wholesale: 'Wholesale',
  product: 'Product enquiry',
  newsletter: 'Mailing list',
}

/** One pill accent per kind, so the four enquiry types are distinguishable at a glance. */
const KIND_ACCENT: Record<string, Accent> = {
  contact: 'neutral',
  wholesale: 'secondary',
  product: 'primary',
  newsletter: 'teal',
}

export default function MessagesPage() {
  const dispatch = useAppDispatch()
  const messages = useAppSelector((state) => state.admin.messages.items) as ContactMessage[]
  const status = useAppSelector((state) => state.admin.messages.status)

  const [kind, setKind] = useState('')
  const [unreadOnly, setUnreadOnly] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<ContactMessage | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ContactMessage | null>(null)
  const [reply, setReply] = useState<{ message: ContactMessage; subject: string; body: string } | null>(null)
  const [replySending, setReplySending] = useState(false)
  const [replyError, setReplyError] = useState<string>()

  useEffect(() => {
    dispatch(loadMessages())
  }, [dispatch])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return messages.filter((message) => {
      if (kind && message.kind !== kind) return false
      if (unreadOnly === 'unread' && message.isRead) return false
      if (unreadOnly === 'read' && !message.isRead) return false
      if (!term) return true
      return (
        message.name.toLowerCase().includes(term) ||
        message.email.toLowerCase().includes(term) ||
        message.message.toLowerCase().includes(term) ||
        (message.company ?? '').toLowerCase().includes(term)
      )
    })
  }, [messages, kind, unreadOnly, search])

  const unreadCount = messages.filter((m) => !m.isRead && m.kind !== 'newsletter').length

  const openMessage = (message: ContactMessage) => {
    setOpen(message)
    if (!message.isRead) dispatch(markMessageRead({ id: message.id, read: true }))
  }

  const startReply = (message: ContactMessage) => {
    setOpen(null)
    setReplyError(undefined)
    setReply({
      message,
      subject: `Re: ${message.subject ?? 'Your enquiry to Albaik'}`,
      body: `Hello ${message.name},\n\n`,
    })
  }

  const sendReply = async () => {
    if (!reply) return
    if (!reply.body.trim()) {
      setReplyError('Write a reply before sending.')
      return
    }

    setReplySending(true)
    setReplyError(undefined)
    try {
      await api.post(endpoints.admin.messageReply(reply.message.id), {
        subject: reply.subject,
        body: reply.body,
      })
      dispatch(loadMessages())
      dispatch(pushToast({ tone: 'success', title: 'Reply sent' }))
      setReply(null)
    } catch (error) {
      setReplyError(errorMessage(error, 'The reply could not be sent.'))
    } finally {
      setReplySending(false)
    }
  }

  const onDelete = async () => {
    if (!pendingDelete) return
    const result = await dispatch(deleteResource({ resource: 'messages', id: pendingDelete.id }))
    if (deleteResource.fulfilled.match(result)) {
      dispatch(pushToast({ tone: 'success', title: 'Message deleted' }))
      setOpen(null)
    } else {
      dispatch(pushToast({ tone: 'error', title: 'Could not delete message' }))
    }
    setPendingDelete(null)
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Inbox"
        title="Messages"
        description="Every submission from the website contact form, the wholesale enquiry form and the footer mailing list."
        actions={
          <Button variant="outline" icon="refresh" onClick={() => dispatch(loadMessages())}>
            Refresh
          </Button>
        }
      />

      <div className="mb-space-md grid grid-cols-1 gap-space-md sm:grid-cols-3">
        {[
          { label: 'Total', value: messages.length, icon: 'mail', accent: 'primary' },
          { label: 'Unread', value: unreadCount, icon: 'info', accent: unreadCount ? 'gold' : 'teal' },
          {
            label: 'Wholesale enquiries',
            value: messages.filter((m) => m.kind === 'wholesale').length,
            icon: 'store',
            accent: 'secondary',
          },
        ].map((tile, index) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: index * 0.05 }}
            className="flex items-center gap-space-sm rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-space-md shadow-e1"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-royal-gradient-compact text-accent-gold">
              <Icon name={tile.icon} size={18} />
            </span>
            <span className="flex flex-col">
              <span className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
                {tile.label}
              </span>
              <span className="font-display text-headline-md font-bold text-on-surface">{tile.value}</span>
            </span>
          </motion.div>
        ))}
      </div>

      <AdminCard bodyClassName="p-space-md">
        <AdminToolbar>
          <Field label="Search" htmlFor="msg-search" className="w-full max-w-xs">
            <TextInput
              id="msg-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email or message…"
            />
          </Field>

          <Field label="Type" htmlFor="msg-kind" className="w-full max-w-[12rem]">
            <Select id="msg-kind" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="">All types</option>
              <option value="contact">General enquiry</option>
              <option value="wholesale">Wholesale</option>
              <option value="product">Product enquiry</option>
              <option value="newsletter">Mailing list</option>
            </Select>
          </Field>

          <Field label="Status" htmlFor="msg-status" className="w-full max-w-[10rem]">
            <Select id="msg-unread" value={unreadOnly} onChange={(event) => setUnreadOnly(event.target.value)}>
              <option value="">All</option>
              <option value="unread">Unread only</option>
              <option value="read">Read only</option>
            </Select>
          </Field>

          <span className="ml-auto text-body-sm text-on-surface-variant">
            {filtered.length} of {messages.length}
          </span>
        </AdminToolbar>

        {status === 'loading' && !messages.length ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length ? (
          <ul className="flex flex-col gap-2">
            {filtered.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => openMessage(message)}
                  className={cn(
                    'flex w-full items-start gap-space-sm rounded-xl border p-space-sm text-left transition-all duration-300',
                    message.isRead
                      ? 'border-outline-variant/40 bg-surface-container-lowest hover:border-secondary/30'
                      : 'border-secondary/30 bg-water-foam/60 hover:border-secondary/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full text-label-md font-bold text-white',
                      message.isRead ? 'bg-surface-container-high text-on-surface-variant' : 'bg-royal-gradient-compact',
                    )}
                  >
                    {message.name.charAt(0).toUpperCase()}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-body-sm font-semibold text-on-surface">{message.name}</span>
                      {!message.isRead ? <Chip accent="gold">New</Chip> : null}
                      <Chip accent={KIND_ACCENT[message.kind] ?? 'neutral'}>
                        {KIND_LABEL[message.kind] ?? message.kind}
                      </Chip>
                      {!message.emailDelivered && message.kind !== 'newsletter' ? (
                        <Chip accent="danger">Not emailed</Chip>
                      ) : null}
                      {message.replyCount > 0 ? <Chip accent="teal">Replied</Chip> : null}
                    </span>
                    <span className="truncate text-body-sm text-on-surface-variant">{message.message}</span>
                    <span className="text-label-sm text-on-surface-variant/70">
                      {message.email} · {formatDate(message.createdAt, true)}
                    </span>
                  </span>

                  <Icon name="chevron_right" size={16} className="mt-2 shrink-0 text-on-surface-variant" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="mail"
            title="No messages match those filters"
            description="New submissions from the website will appear here."
          />
        )}
      </AdminCard>

      {/* ---------------------------------------------------------- detail modal */}
      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? `Message from ${open.name}` : undefined}
        description={open ? `${open.email}${open.phone ? ` · ${open.phone}` : ''}` : undefined}
        size="lg"
        footer={
          <>
            <Button
              variant="danger"
              icon="delete"
              onClick={() => open && setPendingDelete(open)}
              className="mr-auto"
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setOpen(null)}>
              Close
            </Button>
            {open ? (
              <Button variant="primary" icon="mail" onClick={() => startReply(open)}>
                Reply by email
              </Button>
            ) : null}
          </>
        }
      >
        {open ? (
          <div className="flex flex-col gap-space-md">
            <dl className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
              {[
                { label: 'Type', value: KIND_LABEL[open.kind] ?? open.kind },
                { label: 'Received', value: formatDate(open.createdAt, true) },
                { label: 'Subject', value: open.subject ?? '—' },
                { label: 'Company', value: open.company ?? '—' },
                { label: 'Phone', value: open.phone ?? '—' },
                {
                  label: 'Email delivery',
                  value: open.emailDelivered ? 'Delivered to your inbox' : 'Not delivered - see settings',
                },
                {
                  label: 'Replies',
                  value:
                    open.replyCount > 0
                      ? `${open.replyCount} - last ${formatDate(open.repliedAt!, true)}`
                      : 'No replies yet',
                },
              ].map((row) => (
                <div key={row.label} className="flex flex-col rounded-xl bg-surface-container-low p-space-sm">
                  <dt className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
                    {row.label}
                  </dt>
                  <dd className="text-body-sm text-on-surface">{row.value}</dd>
                </div>
              ))}
            </dl>

            {!open.emailDelivered && open.deliveryError ? (
              <div className="flex items-start gap-2 rounded-xl border border-error-container bg-error-container/40 p-space-sm">
                <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-error" />
                <p className="text-body-sm text-on-error-container">{open.deliveryError}</p>
              </div>
            ) : null}

            <div className="rounded-xl border-l-[3px] border-secondary bg-surface-container-low p-space-md">
              <p className="whitespace-pre-wrap text-body-md leading-relaxed text-on-surface">{open.message}</p>
            </div>

            <div className="flex flex-wrap gap-space-sm">
              <Button
                variant="outline"
                icon="copy"
                onClick={() => {
                  navigator.clipboard?.writeText(open.email)
                  dispatch(pushToast({ tone: 'success', title: 'Email copied' }))
                }}
              >
                Copy email
              </Button>
              {open.phone ? (
                <Button
                  variant="outline"
                  icon="whatsapp"
                  onClick={() =>
                    window.open(`https://wa.me/${open.phone!.replace(/[^\d]/g, '')}`, '_blank')
                  }
                >
                  WhatsApp
                </Button>
              ) : null}
              <Button
                variant="subtle"
                icon={open.isRead ? 'visibility' : 'check'}
                onClick={() => {
                  dispatch(markMessageRead({ id: open.id, read: !open.isRead }))
                  setOpen({ ...open, isRead: !open.isRead })
                }}
              >
                Mark as {open.isRead ? 'unread' : 'read'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ---------------------------------------------------------- reply composer */}
      <Modal
        open={Boolean(reply)}
        onClose={() => {
          if (!replySending) setReply(null)
        }}
        title={reply ? `Reply to ${reply.message.name}` : undefined}
        description={reply?.message.email}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReply(null)} disabled={replySending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon="send"
              loading={replySending}
              disabled={!reply?.body.trim()}
              onClick={sendReply}
            >
              Send reply
            </Button>
          </>
        }
      >
        {reply ? (
          <div className="flex flex-col gap-space-md">
            <div className="rounded-xl border-l-[3px] border-secondary bg-surface-container-low p-space-sm">
              <p className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                Original message
              </p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm leading-relaxed text-on-surface">
                {reply.message.message}
              </p>
            </div>

            <Field label="To">
              <TextInput value={reply.message.email} readOnly />
            </Field>

            <Field label="Subject" htmlFor="reply-subject">
              <TextInput
                id="reply-subject"
                value={reply.subject}
                onChange={(event) => setReply({ ...reply, subject: event.target.value })}
              />
            </Field>

            <Field
              label="Message"
              htmlFor="reply-body"
              hint="Sent through your configured SMTP mailbox with the full Albaik email template."
            >
              <TextArea
                id="reply-body"
                rows={10}
                value={reply.body}
                onChange={(event) => setReply({ ...reply, body: event.target.value })}
              />
            </Field>

            {replyError ? <p className="text-body-sm text-error">{replyError}</p> : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={onDelete}
        title="Delete this message?"
        description={pendingDelete ? `The message from ${pendingDelete.name} will be permanently removed.` : undefined}
      />
    </>
  )
}
