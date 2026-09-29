import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { renderIcon, type IconRef } from './Icon'

export type ButtonVariant =
  | 'primary'
  | 'gold'
  | 'outline'
  | 'glass'
  | 'ghost'
  | 'subtle'
  | 'danger'
  | 'success'

export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  // Signature royal gradient with a champagne hairline — the mockup's main CTA.
  //
  // Uses the *compact* gradient (`--bg-royal-gradient-compact`): the full signature
  // ramp opens at Midnight Navy, and at button scale that stop fills most of the
  // control, so primary actions read as near-black instead of sapphire. Same two
  // documented stops, minus the one that only works on large surfaces.
  primary:
    'bg-royal-gradient-compact text-white shadow-md border border-accent-gold/40 hover:brightness-110 hover:shadow-e2',
  gold:
    'bg-gold-gradient text-gradient-midnight font-bold shadow-lg hover:brightness-105 hover:shadow-[0_0_25px_rgba(212,175,55,0.45)]',
  outline:
    'bg-clinical-white text-primary-container border-[1.5px] border-primary-container hover:bg-water-foam',
  glass:
    'bg-white/10 text-white border border-white/20 backdrop-blur-md hover:bg-white/20',
  ghost:
    'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low',
  subtle:
    'bg-surface-container-highest text-on-surface hover:bg-surface-container-high',
  danger: 'bg-error text-on-error hover:brightness-110 shadow-sm',
  /*
   * Was `bg-marine` (#008891). White on that is 4.26:1 — under the 4.5:1 normal-size
   * button text needs, measured on the rendered page rather than estimated. The variant is
   * called `success` and `--color-success` (#1c7a4a) is the token for exactly that: white
   * on it is 5.34:1, and 4.50:1 even after the hover brightness lift. It is also the only
   * `success` button in the app — the WhatsApp CTA on the contact page — so there is
   * nothing else to re-check.
   */
  success: 'bg-success text-white hover:brightness-110 shadow-sm',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-label-md rounded-lg gap-1.5',
  md: 'px-space-md py-2.5 text-label-md rounded-lg gap-2',
  lg: 'px-space-lg py-3.5 text-label-lg rounded-lg gap-2',
}

export interface ButtonBaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** A Material-Symbols key (`"save"`) or a Lucide component (`Save`). */
  icon?: IconRef
  iconRight?: IconRef
  iconSize?: number
  loading?: boolean
  block?: boolean
  className?: string
  children?: React.ReactNode
}

type ButtonProps = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    to?: never
    href?: never
  }

type LinkProps = ButtonBaseProps & { to: string; href?: never }
type AnchorProps = ButtonBaseProps & { href: string; to?: never; target?: string; rel?: string }

const base =
  'inline-flex items-center justify-center font-semibold tracking-[0.02em] transition-all duration-300 select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2'

function content(props: ButtonBaseProps) {
  const { icon, iconRight, iconSize = 18, loading, children } = props
  return (
    <>
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        renderIcon(icon, iconSize)
      )}
      {children}
      {iconRight && !loading ? renderIcon(iconRight, iconSize) : null}
    </>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, className, type = 'button', icon, iconRight, iconSize, loading, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
      // `rest` is DOM props only. `icon` / `iconRight` / `iconSize` / `loading` are
      // pulled out above: spreading them here put `loading="false"` on the element,
      // which React rejects for a non-boolean attribute and warns about on every
      // render. ButtonLink and ButtonAnchor never had the bug because they only put
      // explicit props on their element.
      {...rest}
    >
      {content({ variant, size, icon, iconRight, iconSize, loading, children: rest.children })}
    </button>
  )
})

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  block,
  className,
  to,
  ...rest
}: LinkProps) {
  return (
    <Link to={to} className={cn(base, VARIANTS[variant], SIZES[size], block && 'w-full', className)}>
      {content({ variant, size, ...rest })}
    </Link>
  )
}

export function ButtonAnchor({
  variant = 'primary',
  size = 'md',
  block,
  className,
  href,
  target,
  rel,
  ...rest
}: AnchorProps) {
  return (
    <a
      href={href}
      target={target}
      rel={rel ?? (target === '_blank' ? 'noreferrer noopener' : undefined)}
      className={cn(base, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
    >
      {content({ variant, size, ...rest })}
    </a>
  )
}
