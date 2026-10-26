import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, ChevronDown, CircleAlert, RotateCw, Search, X } from 'lucide-react'
import { TopicCard } from './components/TopicCard'
import { Journal } from './components/Journal'
import { LoginPage } from './components/LoginPage'
import { Notice } from './components/Notice'
import { ThemeToggle } from './components/ThemeToggle'
import { addInterest, createTopic, normalizeTitle, useTopics } from './data/topics'
import { signInWithGoogle, signOut, useSession } from './lib/auth'

type Filter = 'wanted' | 'recent'

const DUPLICATE_MESSAGE = 'That curiosity is already in the collection.'

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('curious-club-theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const { session, authError } = useSession()
  const { topics, setTopics, status, reload, retry } = useTopics(session?.user.id)
  const [newTopic, setNewTopic] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('wanted')
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const notify = (text: string, error = false) => {
    setToast({ text, error })
    window.setTimeout(() => setToast(null), 2800)
  }

  const addTopic = async (event: FormEvent) => {
    event.preventDefault()
    const title = normalizeTitle(newTopic)
    if (!title || submitting) return
    if (topics.some((topic) => topic.title.toLowerCase() === title.toLowerCase())) {
      notify(DUPLICATE_MESSAGE, true)
      return
    }
    setSubmitting(true)
    const error = await createTopic(title)
    setSubmitting(false)
    if (error) {
      // 23505 = unique violation: someone added the same topic (any letter case) first.
      notify(error.code === '23505' ? DUPLICATE_MESSAGE : 'Could not add your curiosity. Please try again.', true)
      return
    }
    setNewTopic('')
    notify('Your curiosity has been added.')
    reload()
  }

  const expressInterest = async (id: string) => {
    // Show the vote right away; the database has the final word on the count.
    setTopics((current) =>
      current.map((topic) => (topic.id === id ? { ...topic, count: topic.count + 1, interested: true } : topic)),
    )
    const error = await addInterest(id)
    if (error && error.code !== '23505') notify('Could not record your interest. Please try again.', true)
    else notify('Noted — curiosity is better shared.')
    if (error) reload()
  }

  const accountName: string = session?.user.user_metadata.full_name ?? session?.user.email ?? ''
  const initials = accountName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  // Topics arrive newest first, so this stable sort breaks vote ties by recency.
  const ranked = useMemo(() => [...topics].sort((a, b) => b.count - a.count), [topics])

  const visibleTopics = useMemo(() => {
    const list = filter === 'wanted' ? ranked : [...topics].sort((a, b) => b.addedAt - a.addedAt)
    return list.filter((topic) => topic.title.toLowerCase().includes(search.toLowerCase()))
  }, [ranked, topics, search, filter])

  const userId = session?.user.id
  const addedByMe = ranked.filter((topic) => topic.createdBy === userId)
  // Your own topics already carry your vote, so they're listed only under "You want to learn".
  const votedByMe = ranked.filter((topic) => topic.interested && topic.createdBy !== userId)

  const totalInterest = topics.reduce((sum, topic) => sum + topic.count, 0)
  const filters: { id: Filter; label: string }[] = [
    { id: 'wanted', label: 'Most wanted' },
    { id: 'recent', label: 'Recently added' },
  ]

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('curious-club-theme', dark ? 'dark' : 'light')
  }, [dark])

  if (session === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p role="status" className="font-serif text-xl text-plum">Opening your journal…</p>
      </main>
    )
  }

  if (!session) {
    return (
      <LoginPage
        onLogin={signInWithGoogle}
        error={authError}
        dark={dark}
        onThemeToggle={() => setDark((current) => !current)}
      />
    )
  }

  return (
    <main className="min-h-screen overflow-x-clip">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-4">
            <div className="flex size-9 items-center justify-center border border-plum text-plum">
              <BookOpen size={17} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-xl leading-none text-plum">curious club</p>
              <p className="mt-1 hidden text-[0.65rem] tracking-wide text-ink/70 sm:block">
                A little curiosity goes a long way.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle dark={dark} onToggle={() => setDark((current) => !current)} />
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-plum"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label="Open account menu"
                title={accountName}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-plum font-serif text-sm text-card">{initials}</span>
                <ChevronDown size={14} className="text-plum" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-20 w-44 border border-ink/15 bg-card p-2 shadow-xl">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      document.getElementById('journal')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-parchment"
                  >
                    My journal
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      signOut().catch(() => notify('Could not sign out. Please try again.', true))
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-parchment"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="relative border-b border-ink/15 px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
        <div className="absolute right-[7%] top-4 hidden font-serif text-[9rem] leading-none text-plum/[0.035] lg:block" aria-hidden="true">?</div>
        <div className="mx-auto max-w-4xl text-center">
          <p className="label mb-4">Your learning journal</p>
          <h1 className="text-balance font-serif text-4xl leading-[1.08] tracking-[-0.025em] text-plum sm:text-5xl">
            What have you been wanting to learn?
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-base leading-7 text-ink/70">
            Put your curiosity out into the world. Someone else might be wondering about the very same thing.
          </p>
          <form onSubmit={addTopic} className="mx-auto mt-6 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <label htmlFor="topic" className="sr-only">A topic you want to learn</label>
            <input
              id="topic"
              value={newTopic}
              onChange={(event) => setNewTopic(event.target.value)}
              placeholder="I've always wanted to learn..."
              maxLength={120}
              className="min-w-0 flex-1 border border-ink/25 bg-card px-5 py-4 text-ink shadow-inner placeholder:text-ink/65 focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
            />
            <button
              type="submit"
              disabled={!normalizeTitle(newTopic) || submitting}
              className="inline-flex items-center justify-center gap-3 bg-plum px-6 py-4 font-semibold text-card transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum disabled:cursor-not-allowed disabled:opacity-65"
            >
              Add to the list <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
          <p className="mt-3 font-serif text-sm italic text-ink/70">Big ambitions, tiny curiosities — everything belongs here.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-12">
        {/* Above the list on small screens, a sticky sidebar on large ones. */}
        <div className="lg:order-last">
          {status === 'ready' && <Journal added={addedByMe} interested={votedByMe} />}
        </div>

        <div>
          <div className="flex flex-col justify-between gap-5 border-b border-ink/15 pb-5 md:flex-row md:items-end">
            <div>
              <p className="label mb-3">The community index</p>
              <h2 className="font-serif text-3xl tracking-tight text-plum sm:text-4xl">A collection of curiosities.</h2>
              <p className="mt-2 text-ink/70">Things we're all hoping to learn, one idea at a time.</p>
            </div>
            <div className="flex gap-6 text-sm">
              <p><span className="block font-serif text-2xl text-plum">{topics.length}</span><span className="text-ink/70">topics</span></p>
              <p><span className="block font-serif text-2xl text-plum">{totalInterest.toLocaleString()}</span><span className="text-ink/70">expressions of interest</span></p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden="true" />
              <label htmlFor="search" className="sr-only">Search curiosities</label>
              <input id="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the collection" className="w-full border-b border-ink/25 bg-transparent py-3 pl-7 pr-8 text-sm outline-none placeholder:text-ink/65 focus:border-plum" />
              {search && <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-0 top-1/2 -translate-y-1/2 text-ink/50 hover:text-plum"><X size={15} /></button>}
            </div>
            <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Sort topics">
              {filters.map((item) => (
                <button key={item.id} role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} className={`whitespace-nowrap border-b px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${filter === item.id ? 'border-plum text-plum' : 'border-transparent text-ink/65 hover:text-ink'}`}>{item.label}</button>
              ))}
            </div>
          </div>

          {status === 'loading' ? (
            <Notice title="Gathering curiosities…" />
          ) : status === 'error' ? (
            <Notice title="The collection didn't load.">
              <p>Check your connection and try again.</p>
              <button type="button" onClick={retry} className="mt-5 inline-flex items-center gap-1.5 border border-plum/35 px-3 py-2 text-xs font-semibold text-plum transition hover:bg-plum hover:text-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum">
                <RotateCw size={13} strokeWidth={1.8} aria-hidden="true" /> Try again
              </button>
            </Notice>
          ) : visibleTopics.length ? (
            <div className="grid gap-2">
              {visibleTopics.map((topic, index) => <TopicCard key={topic.id} topic={topic} index={index} onInterest={expressInterest} />)}
            </div>
          ) : (
            <Notice title="Nothing in the index yet.">
              {topics.length ? 'Try another phrase, or add this curiosity yourself.' : 'Be the first to add something you want to learn.'}
            </Notice>
          )}
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-ink/15 px-5 py-8 text-xs text-ink/70 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p className="font-serif text-base text-plum">Stay curious.</p>
        <p>Curious Club · A shared index of things worth learning</p>
      </footer>

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 border border-gold bg-plum px-5 py-3 text-sm text-card shadow-xl">
          {toast.error ? <CircleAlert size={15} className="text-gold" aria-hidden="true" /> : <Check size={15} className="text-gold" aria-hidden="true" />} {toast.text}
        </div>
      )}
    </main>
  )
}
