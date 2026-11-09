import {
  Activity, Bird, Cat, Coffee, Dog, Flower2, HeartPulse, Leaf, Microscope, Moon, Pill, Plane, Smile, Sparkles, Star,
  Stethoscope, Sun, Syringe, type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'

export interface AvatarChoice { icon?: string; color?: string }

export const AVATAR_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope, 'heart-pulse': HeartPulse, activity: Activity, syringe: Syringe, pill: Pill, microscope: Microscope,
  smile: Smile, sparkles: Sparkles, star: Star, sun: Sun, moon: Moon, leaf: Leaf,
  flower: Flower2, coffee: Coffee, plane: Plane, cat: Cat, dog: Dog, bird: Bird,
}

/** [background, foreground] pairs */
export const AVATAR_COLORS: Record<string, [string, string]> = {
  care: ['#d9efe7', '#24564a'], sky: ['#e0f2fe', '#075985'], violet: ['#ede9fe', '#5b21b6'], rose: ['#ffe4e6', '#9f1239'],
  amber: ['#fef3c7', '#92400e'], slate: ['#e2e8f0', '#1e293b'],
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

const SIZES = { sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-20 w-20 text-2xl' } as const
const ICON_SIZES = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-9 w-9' } as const

export function Avatar({ name, avatar, size = 'sm', className }: { name: string; avatar?: AvatarChoice | null; size?: keyof typeof SIZES; className?: string }) {
  const Icon = avatar?.icon ? AVATAR_ICONS[avatar.icon] : undefined
  const [bg, fg] = AVATAR_COLORS[avatar?.color ?? ''] ?? AVATAR_COLORS.care
  return (
    <span className={clsx('grid shrink-0 place-items-center rounded-full font-semibold', SIZES[size], className)} style={{ background: bg, color: fg }} aria-hidden>
      {Icon ? <Icon className={ICON_SIZES[size]} /> : initials(name)}
    </span>
  )
}
