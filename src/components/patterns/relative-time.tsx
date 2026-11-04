import { useEffect, useState } from 'react'
import { dateTime, relative } from '@/lib/dates'

/**
 * Relative time depends on Date.now(), which differs between the server and the browser.
 * Render the absolute UTC time first (identical on both) and switch to relative after mount.
 */
export function RelativeTime({ value }: { value: string | null | undefined }) {
  const [text, setText] = useState(() => dateTime(value))
  useEffect(() => {
    const update = () => setText(relative(value))
    update()
    const timer = window.setInterval(update, 60_000)
    return () => window.clearInterval(timer)
  }, [value])
  return <span suppressHydrationWarning title={dateTime(value)}>{text}</span>
}
