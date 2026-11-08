import type { Accent } from '@/components/ui/Badge'

export const KIND_LABEL: Record<string, string> = {
  contact: 'General',
  wholesale: 'Wholesale',
  product: 'Product enquiry',
  newsletter: 'Mailing list',
}

export const KIND_ACCENT: Record<string, Accent> = {
  contact: 'neutral',
  wholesale: 'secondary',
  product: 'primary',
  newsletter: 'teal',
}
