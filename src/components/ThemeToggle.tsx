import { Moon, Sun } from 'lucide-react'

type Props = {
  dark: boolean
  onToggle: () => void
  inverted?: boolean
}

export function ThemeToggle({ dark, onToggle, inverted = false }: Props) {
  const Icon = dark ? Sun : Moon

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
      title={`Switch to ${dark ? 'light' : 'dark'} mode`}
      className={`flex size-9 items-center justify-center border transition focus-visible:outline-2 focus-visible:outline-offset-4 ${
        inverted
          ? 'border-login-text/40 text-login-text hover:border-login-gold hover:text-login-gold focus-visible:outline-login-gold'
          : 'border-ink/20 text-plum hover:border-plum hover:bg-plum hover:text-card focus-visible:outline-plum'
      }`}
    >
      <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
    </button>
  )
}
