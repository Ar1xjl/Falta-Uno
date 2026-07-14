import type { ReactNode } from 'react'

export default function PageHeader({
  title,
  leading,
  trailing,
  sticky = false,
}: {
  title: string
  leading?: ReactNode
  trailing?: ReactNode
  sticky?: boolean
}) {
  return (
    <div className={sticky ? 'app-header' : 'flex items-center gap-2 px-4 pt-4 pb-1'}>
      {leading}
      <h1 className="flex-1 truncate text-lg font-bold text-ink">{title}</h1>
      {trailing}
    </div>
  )
}
