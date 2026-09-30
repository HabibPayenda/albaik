import { cn } from '@/lib/utils'
import type { SocialKey } from '@/lib/social'

/**
 * Brand marks for the social rows.
 *
 * Lucide deliberately removed their brand glyphs, so the social logos live here as
 * inline SVG. Keeping them local means the footer stays offline-safe (no icon CDN)
 * and the marks render at any size without a webfont.
 */

export interface BrandIconProps {
  size?: number | string
  className?: string
}

function Svg({
  children,
  size = 16,
  className,
  viewBox = '0 0 24 24',
}: BrandIconProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="currentColor"
      className={cn('shrink-0', className)}
    >
      {children}
    </svg>
  )
}

export function FacebookIcon(props: BrandIconProps) {
  return (
    <Svg {...props}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.017 1.792-4.684 4.533-4.684 1.313 0 2.686.235 2.686.235v2.955H15.83c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </Svg>
  )
}

export function InstagramIcon(props: BrandIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608C4.519 2.567 5.786 2.293 7.152 2.231 8.418 2.175 8.796 2.163 12 2.163Zm0 1.802c-3.15 0-3.522.012-4.766.069-1.15.052-1.775.244-2.19.406-.55.214-.943.469-1.356.882-.413.413-.668.806-.882 1.356-.162.415-.354 1.04-.406 2.19-.057 1.244-.069 1.616-.069 4.766s.012 3.522.069 4.766c.052 1.15.244 1.775.406 2.19.214.55.469.943.882 1.356.413.413.806.668 1.356.882.415.162 1.04.354 2.19.406 1.244.057 1.616.069 4.766.069s3.522-.012 4.766-.069c1.15-.052 1.775-.244 2.19-.406.55-.214.943-.469 1.356-.882.413-.413.668-.806.882-1.356.162-.415.354-1.04.406-2.19.057-1.244.069-1.616.069-4.766s-.012-3.522-.069-4.766c-.052-1.15-.244-1.775-.406-2.19a3.64 3.64 0 0 0-.882-1.356 3.64 3.64 0 0 0-1.356-.882c-.415-.162-1.04-.354-2.19-.406-1.244-.057-1.616-.069-4.766-.069Zm0 3.064a5.808 5.808 0 1 1 0 11.616 5.808 5.808 0 0 1 0-11.616Zm0 1.802a4.006 4.006 0 1 0 0 8.012 4.006 4.006 0 0 0 0-8.012Zm6.406-2.096a1.35 1.35 0 1 1-2.7 0 1.35 1.35 0 0 1 2.7 0Z" />
    </Svg>
  )
}

export function LinkedInIcon(props: BrandIconProps) {
  return (
    <Svg {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0Z" />
    </Svg>
  )
}

export function TikTokIcon(props: BrandIconProps) {
  return (
    <Svg {...props}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
    </Svg>
  )
}

/** Registry so a row can be driven from the settings keys directly. */
export const SOCIAL_ICONS = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
} as const satisfies Record<SocialKey, (props: BrandIconProps) => React.ReactNode>

export type { SocialKey }
