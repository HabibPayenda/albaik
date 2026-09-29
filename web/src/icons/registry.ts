/**
 * The icon registry.
 *
 * The dashboard lets an editor turn individual icons on or off, so the icon selectors
 * across the app only show what is genuinely useful. The registry is the curated
 * shortlist the management page toggles between — names map 1:1 to glyphs the
 * `Icon` component renders, and to Material Symbols names already stored on the site
 * (those keep working through the alias map in `Icon.tsx`).
 *
 * Categories exist to organise the management grid and to let an editor filter by area
 * (commerce, science, content). They are not part of the render path.
 */
import type { LucideIcon } from 'lucide-react'

export type IconCategory =
  | 'brand'
  | 'actions'
  | 'navigation'
  | 'communication'
  | 'science'
  | 'commerce'
  | 'content'
  | 'analytics'
  | 'utility'
  | 'nature'
  | 'device'
  | 'arrows'
  | 'social'
  | 'shapes'

export interface IconEntry {
  /** The name stored in the database (and accepted by the Icon component). */
  name: string
  /** Human-friendly label shown in the management grid and the picker. */
  label: string
  /** Lucide component the Icon component renders. */
  glyph: LucideIcon
  /** Editorial category for the management grid. */
  category: IconCategory
}

/* The categories are defined here so the order is the order shown in the management
 * page, and a new editor can add a category by editing one place. */
export const ICON_CATEGORIES: { key: IconCategory; label: string }[] = [
  { key: 'brand', label: 'Brand & identity' },
  { key: 'actions', label: 'Actions' },
  { key: 'navigation', label: 'Navigation' },
  { key: 'communication', label: 'Communication' },
  { key: 'science', label: 'Science & quality' },
  { key: 'commerce', label: 'Commerce' },
  { key: 'content', label: 'Content' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'utility', label: 'Utility & feedback' },
  { key: 'nature', label: 'Nature' },
  { key: 'device', label: 'Devices' },
  { key: 'arrows', label: 'Arrows' },
  { key: 'social', label: 'Social' },
  { key: 'shapes', label: 'Shapes' },
]

/* The registry is split into category blocks below. Each `define` call is just a way
 * to keep the syntax readable; the resulting object is `{ name, label, glyph, category }`.
 * To add an icon, add the Lucide import alongside the others and append a row here.
 */
import {
  Award,
  BadgeCheck,
  Crown,
  Diamond,
  Flag,
  Heart,
  Leaf,
  Medal,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Wheat,
  Zap,
} from 'lucide-react'
const brandIcons = (g: IconCategory): IconEntry[] => [
  { name: 'star', label: 'Star', glyph: Star, category: g },
  { name: 'sparkles', label: 'Sparkles', glyph: Sparkles, category: g },
  { name: 'auto_awesome', label: 'Auto awesome', glyph: Sparkles, category: g },
  { name: 'spa', label: 'Care & spa', glyph: Sparkles, category: g },
  { name: 'palette', label: 'Palette', glyph: Palette, category: g },
  { name: 'verified', label: 'Verified', glyph: BadgeCheck, category: g },
  { name: 'verified_user', label: 'Verified user', glyph: ShieldCheck, category: g },
  { name: 'workspace_premium', label: 'Premium', glyph: Award, category: g },
  { name: 'award', label: 'Award', glyph: Award, category: g },
  { name: 'trophy', label: 'Trophy', glyph: Trophy, category: g },
  { name: 'medal', label: 'Medal', glyph: Medal, category: g },
  { name: 'shield', label: 'Shield', glyph: Shield, category: g },
  { name: 'shield_check', label: 'Shield check', glyph: ShieldCheck, category: g },
  { name: 'crown', label: 'Crown', glyph: Crown, category: g },
  { name: 'diamond', label: 'Diamond', glyph: Diamond, category: g },
  { name: 'heart', label: 'Heart', glyph: Heart, category: g },
  { name: 'leaf', label: 'Leaf', glyph: Leaf, category: g },
  { name: 'eco', label: 'Eco', glyph: Leaf, category: g },
  { name: 'grain', label: 'Grain', glyph: Wheat, category: g },
  { name: 'flag', label: 'Flag', glyph: Flag, category: g },
  { name: 'zap', label: 'Zap', glyph: Zap, category: g },
]

import {
  Plus,
  Minus,
  Pencil,
  Trash2,
  Save,
  Copy,
  Upload,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Filter,
  GripVertical,
  Settings,
  Lock,
  Unlock,
  LogOut,
  X,
  Check,
  Search,
  ChevronDown,
} from 'lucide-react'
const actionIcons = (g: IconCategory): IconEntry[] => [
  { name: 'add', label: 'Add', glyph: Plus, category: g },
  { name: 'remove', label: 'Remove', glyph: Minus, category: g },
  { name: 'edit', label: 'Edit', glyph: Pencil, category: g },
  { name: 'delete', label: 'Delete', glyph: Trash2, category: g },
  { name: 'save', label: 'Save', glyph: Save, category: g },
  { name: 'copy', label: 'Copy', glyph: Copy, category: g },
  { name: 'upload', label: 'Upload', glyph: Upload, category: g },
  { name: 'download', label: 'Download', glyph: Download, category: g },
  { name: 'eye', label: 'View', glyph: Eye, category: g },
  { name: 'visibility', label: 'Visibility', glyph: Eye, category: g },
  { name: 'eye_off', label: 'Hide', glyph: EyeOff, category: g },
  { name: 'refresh', label: 'Refresh', glyph: RefreshCw, category: g },
  { name: 'filter', label: 'Filter', glyph: Filter, category: g },
  { name: 'sort', label: 'Sort', glyph: GripVertical, category: g },
  { name: 'drag', label: 'Drag', glyph: GripVertical, category: g },
  { name: 'settings', label: 'Settings', glyph: Settings, category: g },
  { name: 'lock', label: 'Lock', glyph: Lock, category: g },
  { name: 'unlock', label: 'Unlock', glyph: Unlock, category: g },
  { name: 'logout', label: 'Log out', glyph: LogOut, category: g },
  { name: 'close', label: 'Close', glyph: X, category: g },
  { name: 'check', label: 'Check', glyph: Check, category: g },
  { name: 'search', label: 'Search', glyph: Search, category: g },
  { name: 'expand_more', label: 'Expand more', glyph: ChevronDown, category: g },
]

import {
  Home,
  Menu,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ExternalLink,
  Navigation,
  LayoutDashboard,
  FolderTree,
  Layers,
  Circle,
  MoreHorizontal,
} from 'lucide-react'
const navigationIcons = (g: IconCategory): IconEntry[] => [
  { name: 'menu', label: 'Menu', glyph: Menu, category: g },
  { name: 'home', label: 'Home', glyph: Home, category: g },
  { name: 'navigation', label: 'Navigation', glyph: Navigation, category: g },
  { name: 'dashboard', label: 'Dashboard', glyph: LayoutDashboard, category: g },
  { name: 'category', label: 'Category', glyph: FolderTree, category: g },
  { name: 'layers', label: 'Layers', glyph: Layers, category: g },
  { name: 'arrow_forward', label: 'Arrow right', glyph: ArrowRight, category: g },
  { name: 'arrow_back', label: 'Arrow left', glyph: ArrowLeft, category: g },
  { name: 'arrow_upward', label: 'Arrow up', glyph: ArrowUp, category: g },
  { name: 'arrow_downward', label: 'Arrow down', glyph: ArrowDown, category: g },
  { name: 'arrow_up_right', label: 'Arrow up-right', glyph: ArrowUpRight, category: g },
  { name: 'north_east', label: 'North east', glyph: ArrowUpRight, category: g },
  { name: 'sort_arrow', label: 'Sort arrow', glyph: ArrowUpDown, category: g },
  { name: 'chevron_right', label: 'Chevron right', glyph: ChevronRight, category: g },
  { name: 'chevron_left', label: 'Chevron left', glyph: ChevronLeft, category: g },
  { name: 'keyboard_double_arrow_left', label: 'Double chevron left', glyph: ChevronsLeft, category: g },
  { name: 'open_in_new', label: 'Open in new', glyph: ExternalLink, category: g },
  { name: 'more_horizontal', label: 'More', glyph: MoreHorizontal, category: g },
  { name: 'circle', label: 'Circle', glyph: Circle, category: g },
]

import {
  Mail,
  Phone,
  MessageCircle,
  MessageSquare,
  Send,
  Bell,
  Volume2,
  AtSign,
  Hash,
  Inbox,
} from 'lucide-react'
const communicationIcons = (g: IconCategory): IconEntry[] => [
  { name: 'mail', label: 'Mail', glyph: Mail, category: g },
  { name: 'message', label: 'Message', glyph: Mail, category: g },
  { name: 'messages', label: 'Messages', glyph: Mail, category: g },
  { name: 'email', label: 'Email', glyph: Mail, category: g },
  { name: 'phone', label: 'Phone', glyph: Phone, category: g },
  { name: 'whatsapp', label: 'WhatsApp', glyph: MessageCircle, category: g },
  { name: 'chat', label: 'Chat', glyph: MessageSquare, category: g },
  { name: 'send', label: 'Send', glyph: Send, category: g },
  { name: 'bell', label: 'Notifications', glyph: Bell, category: g },
  { name: 'volume', label: 'Volume', glyph: Volume2, category: g },
  { name: 'at_sign', label: 'Mention', glyph: AtSign, category: g },
  { name: 'tag_label', label: 'Tag', glyph: Hash, category: g },
  { name: 'inbox', label: 'Inbox', glyph: Inbox, category: g },
]

import {
  FlaskConical,
  TestTube,
  Microscope,
  Atom,
  Beaker,
  Syringe,
  Thermometer,
  HeartPulse,
  Pill,
  ClipboardList,
  ShieldPlus,
} from 'lucide-react'
const scienceIcons = (g: IconCategory): IconEntry[] => [
  { name: 'science', label: 'Science', glyph: FlaskConical, category: g },
  { name: 'flask', label: 'Flask', glyph: FlaskConical, category: g },
  { name: 'test_tube', label: 'Test tube', glyph: TestTube, category: g },
  { name: 'microscope', label: 'Microscope', glyph: Microscope, category: g },
  { name: 'atom', label: 'Atom', glyph: Atom, category: g },
  { name: 'beaker', label: 'Beaker', glyph: Beaker, category: g },
  { name: 'syringe', label: 'Syringe', glyph: Syringe, category: g },
  { name: 'thermometer', label: 'Thermometer', glyph: Thermometer, category: g },
  { name: 'healing', label: 'Healing', glyph: HeartPulse, category: g },
  { name: 'heart_pulse', label: 'Heart pulse', glyph: HeartPulse, category: g },
  { name: 'pill', label: 'Pill', glyph: Pill, category: g },
  { name: 'clipboard', label: 'Clipboard', glyph: ClipboardList, category: g },
  { name: 'lab_panel', label: 'Lab panel', glyph: ShieldPlus, category: g },
]

import {
  ShoppingBag,
  ShoppingCart,
  Package,
  Store,
  Truck,
  CreditCard,
  Wallet,
  Receipt,
  Tag as Tag2,
  Percent,
  Gift,
  BadgePercent,
  Boxes,
} from 'lucide-react'
const commerceIcons = (g: IconCategory): IconEntry[] => [
  { name: 'shopping_bag', label: 'Shopping bag', glyph: ShoppingBag, category: g },
  { name: 'shopping_cart', label: 'Cart', glyph: ShoppingCart, category: g },
  { name: 'package', label: 'Package', glyph: Package, category: g },
  { name: 'inventory_2', label: 'Inventory', glyph: Package, category: g },
  { name: 'store', label: 'Store', glyph: Store, category: g },
  { name: 'local_shipping', label: 'Shipping', glyph: Truck, category: g },
  { name: 'delivery', label: 'Delivery', glyph: Truck, category: g },
  { name: 'credit_card', label: 'Payment', glyph: CreditCard, category: g },
  { name: 'wallet', label: 'Wallet', glyph: Wallet, category: g },
  { name: 'receipt', label: 'Receipt', glyph: Receipt, category: g },
  { name: 'tag', label: 'Tag', glyph: Tag2, category: g },
  { name: 'brand', label: 'Brand', glyph: Tag2, category: g },
  { name: 'product', label: 'Product', glyph: Tag2, category: g },
  { name: 'percent', label: 'Percent', glyph: Percent, category: g },
  { name: 'sale', label: 'Sale', glyph: BadgePercent, category: g },
  { name: 'gift', label: 'Gift', glyph: Gift, category: g },
  { name: 'boxes', label: 'Boxes', glyph: Boxes, category: g },
]

import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Calendar,
  Clock,
  BookOpen,
  Newspaper,
  Pen,
  Edit3,
  AlignLeft,
  Type,
  Link2,
  Quote,
} from 'lucide-react'
const contentIcons = (g: IconCategory): IconEntry[] => [
  { name: 'page', label: 'Page', glyph: FileText, category: g },
  { name: 'file_text', label: 'File', glyph: FileText, category: g },
  { name: 'format_image_left', label: 'Image left', glyph: ImageIcon, category: g },
  { name: 'image', label: 'Image', glyph: ImageIcon, category: g },
  { name: 'video', label: 'Video', glyph: Video, category: g },
  { name: 'audio', label: 'Audio', glyph: Music, category: g },
  { name: 'calendar', label: 'Calendar', glyph: Calendar, category: g },
  { name: 'schedule', label: 'Schedule', glyph: Clock, category: g },
  { name: 'clock', label: 'Clock', glyph: Clock, category: g },
  { name: 'book', label: 'Book', glyph: BookOpen, category: g },
  { name: 'article', label: 'Article', glyph: Newspaper, category: g },
  { name: 'pen', label: 'Pen', glyph: Pen, category: g },
  { name: 'edit_note', label: 'Edit note', glyph: Edit3, category: g },
  { name: 'text_fields', label: 'Text fields', glyph: AlignLeft, category: g },
  { name: 'title', label: 'Title', glyph: Type, category: g },
  { name: 'link', label: 'Link', glyph: Link2, category: g },
  { name: 'quote', label: 'Quote', glyph: Quote, category: g },
]

import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Gauge,
  LineChart,
} from 'lucide-react'
const analyticsIcons = (g: IconCategory): IconEntry[] => [
  { name: 'analytics', label: 'Analytics', glyph: BarChart3, category: g },
  { name: 'bar_chart', label: 'Bar chart', glyph: BarChart3, category: g },
  { name: 'pie_chart', label: 'Pie chart', glyph: PieChart, category: g },
  { name: 'line_chart', label: 'Line chart', glyph: LineChart, category: g },
  { name: 'trending_up', label: 'Trending up', glyph: TrendingUp, category: g },
  { name: 'trending_down', label: 'Trending down', glyph: TrendingDown, category: g },
  { name: 'activity', label: 'Activity', glyph: Activity, category: g },
  { name: 'target', label: 'Target', glyph: Target, category: g },
  { name: 'gauge', label: 'Gauge', glyph: Gauge, category: g },
]

import {
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  CheckCircle2,
  CheckCheck,
  XCircle,
  Power,
  Loader,
  Moon,
  Sun,
  MapPin,
  Globe,
  Languages,
  User,
  Users,
  Smile,
} from 'lucide-react'
const utilityIcons = (g: IconCategory): IconEntry[] => [
  { name: 'info', label: 'Info', glyph: Info, category: g },
  { name: 'warning', label: 'Warning', glyph: AlertTriangle, category: g },
  { name: 'error', label: 'Error', glyph: AlertCircle, category: g },
  { name: 'help', label: 'Help', glyph: HelpCircle, category: g },
  { name: 'check_circle', label: 'Check circle', glyph: CheckCircle2, category: g },
  { name: 'double_check', label: 'Double check', glyph: CheckCheck, category: g },
  { name: 'x_circle', label: 'X circle', glyph: XCircle, category: g },
  { name: 'power', label: 'Power', glyph: Power, category: g },
  { name: 'loader', label: 'Loader', glyph: Loader, category: g },
  { name: 'sun', label: 'Sun', glyph: Sun, category: g },
  { name: 'moon', label: 'Moon', glyph: Moon, category: g },
  { name: 'location_on', label: 'Location', glyph: MapPin, category: g },
  { name: 'globe', label: 'Globe', glyph: Globe, category: g },
  { name: 'language', label: 'Language', glyph: Languages, category: g },
  { name: 'person', label: 'Person', glyph: User, category: g },
  { name: 'users', label: 'Users', glyph: Users, category: g },
  { name: 'face', label: 'Face', glyph: Smile, category: g },
  { name: 'dentistry', label: 'Dentistry', glyph: Smile, category: g },
]

import {
  Droplet,
  Droplets,
  Waves,
  Snowflake,
  Cloud,
  CloudRain,
  Sun as Sun2,
  Flame,
  Sunrise,
  Moon as Moon2,
  Wind,
  Sprout,
  TreePine,
  Flower2,
} from 'lucide-react'
const natureIcons = (g: IconCategory): IconEntry[] => [
  { name: 'water', label: 'Water', glyph: Waves, category: g },
  { name: 'water_drop', label: 'Water drop', glyph: Droplet, category: g },
  { name: 'bubbles', label: 'Bubbles', glyph: Droplets, category: g },
  { name: 'oil_barrel', label: 'Oil barrel', glyph: Droplets, category: g },
  { name: 'ac_unit', label: 'Cold', glyph: Snowflake, category: g },
  { name: 'cloud', label: 'Cloud', glyph: Cloud, category: g },
  { name: 'rain', label: 'Rain', glyph: CloudRain, category: g },
  { name: 'sunny', label: 'Sunny', glyph: Sun2, category: g },
  { name: 'flame', label: 'Flame', glyph: Flame, category: g },
  { name: 'sunrise', label: 'Sunrise', glyph: Sunrise, category: g },
  { name: 'moon_phase', label: 'Moon', glyph: Moon2, category: g },
  { name: 'wind', label: 'Wind', glyph: Wind, category: g },
  { name: 'sprout', label: 'Sprout', glyph: Sprout, category: g },
  { name: 'tree', label: 'Tree', glyph: TreePine, category: g },
  { name: 'flower', label: 'Flower', glyph: Flower2, category: g },
]

import {
  Monitor,
  Smartphone,
  Tablet,
  Watch,
  Camera,
  Printer,
  Wifi,
  Battery,
  HardDrive,
  Cpu,
} from 'lucide-react'
const deviceIcons = (g: IconCategory): IconEntry[] => [
  { name: 'monitor', label: 'Monitor', glyph: Monitor, category: g },
  { name: 'phone_android', label: 'Phone', glyph: Smartphone, category: g },
  { name: 'tablet', label: 'Tablet', glyph: Tablet, category: g },
  { name: 'watch', label: 'Watch', glyph: Watch, category: g },
  { name: 'camera', label: 'Camera', glyph: Camera, category: g },
  { name: 'printer', label: 'Printer', glyph: Printer, category: g },
  { name: 'wifi', label: 'Wi-Fi', glyph: Wifi, category: g },
  { name: 'battery', label: 'Battery', glyph: Battery, category: g },
  { name: 'storage', label: 'Storage', glyph: HardDrive, category: g },
  { name: 'memory', label: 'Memory', glyph: Cpu, category: g },
]

import {
  ArrowUp as ArrowUpOnly,
  ArrowDown as ArrowDownOnly,
  ArrowLeft as ArrowLeftOnly,
  ArrowRight as ArrowRightOnly,
  ArrowUpRight as ArrowUpRightOnly,
  ChevronUp,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
} from 'lucide-react'
const arrowIcons = (g: IconCategory): IconEntry[] => [
  { name: 'arrow_up_alt', label: 'Arrow up', glyph: ArrowUpOnly, category: g },
  { name: 'arrow_down_alt', label: 'Arrow down', glyph: ArrowDownOnly, category: g },
  { name: 'arrow_left_alt', label: 'Arrow left', glyph: ArrowLeftOnly, category: g },
  { name: 'arrow_right_alt', label: 'Arrow right', glyph: ArrowRightOnly, category: g },
  { name: 'arrow_up_right_alt', label: 'Arrow up-right', glyph: ArrowUpRightOnly, category: g },
  { name: 'expand_less', label: 'Expand less', glyph: ChevronUp, category: g },
  { name: 'expand_circle_up', label: 'Expand up', glyph: CornerUpRight, category: g },
  { name: 'arrow_back_ios', label: 'Back iOS', glyph: CornerUpLeft, category: g },
  { name: 'arrow_forward_ios', label: 'Forward iOS', glyph: CornerDownRight, category: g },
  { name: 'keyboard_return', label: 'Return', glyph: CornerDownLeft, category: g },
]

import {
  Heart as HeartSocial,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  UserPlus,
  UserCheck,
  Flag as FlagSocial,
} from 'lucide-react'
const socialIcons = (g: IconCategory): IconEntry[] => [
  { name: 'favorite', label: 'Favourite', glyph: HeartSocial, category: g },
  { name: 'thumb_up', label: 'Thumb up', glyph: ThumbsUp, category: g },
  { name: 'thumb_down', label: 'Thumb down', glyph: ThumbsDown, category: g },
  { name: 'share', label: 'Share', glyph: Share2, category: g },
  { name: 'bookmark', label: 'Bookmark', glyph: Bookmark, category: g },
  { name: 'person_add', label: 'Add person', glyph: UserPlus, category: g },
  { name: 'person_check', label: 'Person check', glyph: UserCheck, category: g },
  { name: 'report', label: 'Report', glyph: FlagSocial, category: g },
]

import {
  Square,
  Triangle,
  Hexagon,
  Octagon,
  Cylinder,
  Box,
  Container,
} from 'lucide-react'
const shapeIcons = (g: IconCategory): IconEntry[] => [
  { name: 'square', label: 'Square', glyph: Square, category: g },
  { name: 'triangle', label: 'Triangle', glyph: Triangle, category: g },
  { name: 'hexagon', label: 'Hexagon', glyph: Hexagon, category: g },
  { name: 'octagon', label: 'Octagon', glyph: Octagon, category: g },
  { name: 'cylinder', label: 'Cylinder', glyph: Cylinder, category: g },
  { name: 'box', label: 'Box', glyph: Box, category: g },
  { name: 'package_2', label: 'Package 2', glyph: Container, category: g },
]

/* The full list, in category order. */
export const ICON_REGISTRY: IconEntry[] = [
  ...brandIcons('brand'),
  ...actionIcons('actions'),
  ...navigationIcons('navigation'),
  ...communicationIcons('communication'),
  ...scienceIcons('science'),
  ...commerceIcons('commerce'),
  ...contentIcons('content'),
  ...analyticsIcons('analytics'),
  ...utilityIcons('utility'),
  ...natureIcons('nature'),
  ...deviceIcons('device'),
  ...arrowIcons('arrows'),
  ...socialIcons('social'),
  ...shapeIcons('shapes'),
]

export const ICON_BY_NAME: Record<string, IconEntry> = Object.fromEntries(
  ICON_REGISTRY.map((entry) => [entry.name, entry]),
)