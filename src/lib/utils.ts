import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The theme's custom text sizes are not in tailwind-merge's default scale. Teach it, or
// cn('text-small', 'text-muted-foreground') treats both as colours and silently drops one.
// `label` stays listed while the older scale is still referenced during the redesign.
const FONT_SIZES = [
  'label',
  'tiny',
  'micro',
  'meta',
  'small',
  'copy',
  'body',
  'ui',
  'lead',
  'stat',
  'title',
  'title-lg',
  'section',
  'display-sm',
  'display',
  'hero',
  'masthead',
]

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
