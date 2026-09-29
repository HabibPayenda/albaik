import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Award,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Circle,
  ClipboardList,
  Clock,
  Copy,
  Cylinder,
  Download,
  Droplet,
  Droplets,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  FlaskConical,
  FolderTree,
  Globe,
  GripVertical,
  HeartPulse,
  Home,
  Image as ImageIcon,
  Info,
  Layers,
  LayoutDashboard,
  Leaf,
  Link2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Navigation,
  Package,
  Palette,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Smile,
  Snowflake,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  User,
  Users,
  Waves,
  Wheat,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ICON_BY_NAME } from '@/icons/registry'

/**
 * The design source uses Google's Material Symbols. Those require a remote font,
 * so every name the CMS can store is mapped to a locally bundled Lucide glyph.
 * Unknown names fall back to a neutral dot rather than breaking the layout.
 *
 * This is the *legacy* alias map: names that were already stored on the site before
 * the curated registry existed. It is consulted second (see `resolve`), so anything
 * in here keeps rendering even if it was never added to the registry. Names here do
 * not appear in the icon selectors — add an entry to `icons/registry.ts` for that.
 */
const ICONS: Record<string, LucideIcon> = {
  // brand / product semantics
  spa: Sparkles,
  auto_awesome: Sparkles,
  water: Waves,
  water_drop: Droplet,
  bubbles: Droplets,
  oil_barrel: Cylinder,
  ac_unit: Snowflake,
  healing: HeartPulse,
  grain: Wheat,
  science: FlaskConical,
  eco: Leaf,
  verified: BadgeCheck,
  verified_user: ShieldCheck,
  workspace_premium: Award,
  inventory_2: Package,
  local_shipping: Truck,
  store: Store,
  assignment: ClipboardList,
  format_image_left: ImageIcon,
  dentistry: Smile,
  face: Smile,
  shield: Shield,

  // navigation / chrome
  menu: Menu,
  close: X,
  search: Search,
  shopping_bag: ShoppingBag,
  person: User,
  language: Globe,
  location_on: MapPin,
  expand_more: ChevronDown,
  chevron_right: ChevronRight,
  chevron_left: ChevronLeft,
  arrow_forward: ArrowRight,
  arrow_back: ArrowLeft,
  arrow_upward: ArrowUp,
  arrow_downward: ArrowDown,
  north_east: ArrowUpRight,
  open_in_new: ExternalLink,
  keyboard_double_arrow_left: ChevronsLeft,

  // admin
  dashboard: LayoutDashboard,
  category: FolderTree,
  brand: Tag,
  product: Package,
  layers: Layers,
  message: Mail,
  messages: Mail,
  settings: Settings,
  page: FileText,
  navigation: Navigation,
  home: Home,
  image: ImageIcon,
  palette: Palette,
  link: Link2,
  users: Users,
  analytics: BarChart3,
  trending_up: TrendingUp,

  // actions & feedback
  edit: Pencil,
  delete: Trash2,
  add: Plus,
  remove: Minus,
  save: Save,
  logout: LogOut,
  lock: Lock,
  mail: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  upload: Upload,
  download: Download,
  copy: Copy,
  drag: GripVertical,
  refresh: RefreshCw,
  filter: Filter,
  sort: ArrowUpDown,
  schedule: Clock,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  star: Star,
  check: Check,
  check_circle: CheckCircle2,
  visibility: Eye,
}

/**
 * Resolve a stored name to a glyph. Order matters:
 *
 *  1. the curated registry — the icons an editor can switch on and off from the
 *     dashboard, and therefore the only ones the icon selectors offer;
 *  2. the legacy alias map above, so names already saved on the site keep rendering;
 *  3. a neutral dot, which never breaks a layout.
 */
function resolve(name: string | null | undefined): LucideIcon {
  if (!name) return Circle
  return ICON_BY_NAME[name]?.glyph ?? ICONS[name] ?? Circle
}

/**
 * `name` shadows the `name` attribute that exists on every SVG element, so it has to be
 * omitted before we can widen it to accept a Material-Symbols string.
 */
export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name?: string | null
  size?: number
  strokeWidth?: number
}

/** Shape any Lucide glyph satisfies, so callers can pass a component instead of a name. */
export interface IconGlyphProps {
  size?: number | string
  strokeWidth?: number
  className?: string
}

export type IconGlyph = React.ComponentType<IconGlyphProps>

/** Either a Material-Symbols key (`"save"`) or a Lucide component (`Save`). */
export type IconRef = string | IconGlyph

/**
 * Human label for a stored name — what the icon selectors show next to the glyph.
 * Names outside the registry fall back to a de-slugified version of themselves so an
 * unrecognised value still reads as something rather than as raw snake_case.
 */
export function iconLabel(name: string | null | undefined): string {
  if (!name) return ''
  return ICON_BY_NAME[name]?.label ?? name.replace(/_/g, ' ')
}

export function Icon({ name, size = 20, strokeWidth = 1.75, className, ...rest }: IconProps) {
  const Glyph = resolve(name)
  return (
    <Glyph
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      aria-hidden="true"
      {...rest}
    />
  )
}

/** Render an `IconRef` without the caller needing to branch on string vs component. */
export function renderIcon(icon: IconRef | null | undefined, size: number, className?: string) {
  if (!icon) return null
  if (typeof icon === 'string') return <Icon name={icon} size={size} className={className} />
  const Glyph = icon
  return <Glyph size={size} strokeWidth={1.75} className={className} />
}

export default Icon
