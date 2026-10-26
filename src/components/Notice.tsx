import type { ReactNode } from 'react'

type Props = {
  title: string
  children?: ReactNode
}

export function Notice({ title, children }: Props) {
  return (
    <div role="status" className="border border-ink/15 bg-card px-6 py-16 text-center">
      <p className="font-serif text-2xl text-plum">{title}</p>
      {children && <div className="mt-2 text-sm text-ink/70">{children}</div>}
    </div>
  )
}
