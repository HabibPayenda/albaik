export interface ProductCard {
  id: number
  slug: string
  name: string
  subtitle?: string
  formulationLabel?: string
  shortDescription?: string
  size?: string
  price?: number | null
  compareAtPrice?: number | null
  currency: string
  rating?: number | null
  reviewCount: number
  badge?: string
  badgeStyle?: string
  stockStatus?: string
  imageUrl?: string
  accentFrom?: string
  accentTo?: string
  benefits: string[]
  ingredients: string[]
  isFeatured: boolean
  brandId: number
  brandSlug?: string
  brandName?: string
  categoryId: number
  categorySlug?: string
  categoryName?: string
  /** Product number in the International Barcode Network: digits only, unique, optional. */
  ibn?: string | null
}

export interface ProductImage {
  id: number
  url: string
  alt?: string
  sortOrder: number
}

/** What a scanned product QR code resolves to. */
export interface VerifyProduct {
  slug: string
  name: string
  brandName?: string | null
  imageUrl?: string | null
  subtitle?: string | null
  formulationLabel?: string | null
  ibn?: string | null
}

export interface ProductDetail extends Omit<ProductCard, 'benefits'> {
  description?: string
  /** Staff-written search snippet; falls back to the short description when empty. */
  metaDescription?: string
  priceNote?: string
  benefits: string[]
  howToUse?: string
  safetyNote?: string
  suitableFor?: string
  isActive: boolean
  sortOrder: number
  brandTagline?: string
  images: ProductImage[]
  related: ProductCard[]
}

export interface Brand {
  id: number
  slug: string
  name: string
  tagline?: string
  description?: string
  logoUrl?: string
  imageUrl?: string
  accent?: string
  categoryId: number
  categorySlug?: string
  categoryName?: string
  sortOrder: number
  isActive: boolean
  isFeatured: boolean
  productCount: number
  products?: ProductCard[]
}

export interface Category {
  id: number
  slug: string
  name: string
  nameDari?: string
  namePashto?: string
  tagline?: string
  description?: string
  imageUrl?: string
  icon?: string
  accent?: string
  sortOrder: number
  isActive: boolean
  showInNav: boolean
  brandCount: number
  productCount: number
  brands?: Brand[]
}

export interface SiteSetting {
  key: string
  value?: string | null
  group: string
  label?: string
  inputType: string
  sortOrder: number
}

export interface NavLink {
  id: number
  label: string
  path: string
  group?: string
  openInNewTab: boolean
  sortOrder: number
  isActive: boolean
}

export interface FooterLink {
  id: number
  group: string
  label: string
  path: string
  openInNewTab: boolean
  sortOrder: number
  isActive: boolean
}

export interface QuickLink {
  id: number
  label: string
  path: string
  openInNewTab: boolean
  sortOrder: number
  isActive: boolean
}

export interface HomeSection {
  id: number
  key: string
  sectionType: string
  eyebrow?: string
  title?: string
  subtitle?: string
  body?: string
  imageUrl?: string
  primaryCtaLabel?: string
  primaryCtaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  dataJson?: string
  /** Hero carousel slides (JSON array). Present only on the hero section. */
  slidesJson?: string | null
  sortOrder: number
  isVisible: boolean
}

export interface HeroStat {
  id: number
  value: string
  label: string
  accent?: string
  sortOrder: number
  isActive: boolean
}

export interface Testimonial {
  id: number
  name: string
  role?: string
  initials?: string
  title?: string
  quote?: string
  rating: number
  avatarUrl?: string
  sortOrder: number
  isActive: boolean
}

export interface TrustPillar {
  id: number
  icon: string
  title: string
  subtitle?: string
  accent?: string
  sortOrder: number
  isActive: boolean
}

export interface HairProfile {
  id: number
  key: string
  icon: string
  title: string
  badge?: string
  badgeStyle?: string
  description?: string
  metricValue?: string
  metricLabel?: string
  sortOrder: number
  isActive: boolean
}

export interface Page {
  id: number
  slug: string
  title: string
  subtitle?: string
  eyebrow?: string
  contentHtml?: string
  metaDescription?: string
  sortOrder: number
  isPublished: boolean
  updatedAt: string
}

export interface ContactMessage {
  id: number
  name: string
  email: string
  phone?: string
  company?: string
  subject?: string
  message: string
  kind: string
  isRead: boolean
  emailDelivered: boolean
  deliveryError?: string
  createdAt: string
  repliedAt?: string | null
  replyCount: number
  customerReplyCount: number
  lastCustomerReplyAt?: string | null
}

export interface ContactMessageReply {
  id: number
  contactMessageId: number
  subject: string
  body: string
  fromAddress: string
  toAddress: string
  sentAt: string
  source: string
}

export interface AdminUser {
  id: number
  username: string
  email?: string
  displayName?: string
  role: string
  isActive: boolean
  lastLoginAt?: string
}

export interface Bootstrap {
  settings: SiteSetting[]
  nav: NavLink[]
  footer: FooterLink[]
  quickLinks: QuickLink[]
  hasQuickLinks: boolean
  categories: Category[]
  brands: Brand[]
}

export interface HomePayload {
  sections: HomeSection[]
  heroStats: HeroStat[]
  featuredProducts: ProductCard[]
  testimonials: Testimonial[]
  trustPillars: TrustPillar[]
  hairProfiles: HairProfile[]
  categories: Category[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminStats {
  categories: number
  brands: number
  products: number
  activeProducts: number
  featuredProducts: number
  testimonials: number
  pages: number
  messages: number
  unreadMessages: number
  subscribers: number
  recentMessages: ContactMessage[]
}

export interface ProductInput {
  name: string
  slug?: string
  categoryId: number
  brandId: number
  subtitle?: string
  formulationLabel?: string
  shortDescription?: string
  description?: string
  metaDescription?: string
  size?: string
  price?: number | null
  compareAtPrice?: number | null
  currency: string
  priceNote?: string
  rating?: number | null
  reviewCount: number
  badge?: string
  badgeStyle?: string
  stockStatus?: string
  imageUrl?: string
  accentFrom?: string
  accentTo?: string
  benefits: string[]
  ingredients: string[]
  howToUse?: string
  safetyNote?: string
  suitableFor?: string
  /** Product number in the International Barcode Network: digits only, unique, optional. */
  ibn?: string
  isFeatured: boolean
  isActive: boolean
  sortOrder: number
  images: { url: string; alt?: string; sortOrder: number }[]
}
