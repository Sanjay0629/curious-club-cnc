import type { Topic } from '../data/topics'

type Props = {
  added: Topic[]
  interested: Topic[]
}

export function Journal({ added, interested }: Props) {
  return (
    <aside id="journal" aria-label="Your journal" className="scroll-mt-6 border border-ink/15 bg-card p-5 lg:sticky lg:top-6">
      <p className="label">Your journal</p>
      <JournalList title="You want to learn" topics={added} empty="Nothing yet. Add a curiosity above." />
      <JournalList title="You're interested in" topics={interested} empty="Nothing yet. Tap “I'm interested” on any topic." />
    </aside>
  )
}

type ListProps = {
  title: string
  topics: Topic[]
  empty: string
}

function JournalList({ title, topics, empty }: ListProps) {
  return (
    <section className="mt-5">
      <h3 className="flex items-baseline justify-between gap-3 border-b border-ink/15 pb-2 font-serif text-lg text-plum">
        {title}
        <span className="font-sans text-xs text-ink/70">{topics.length}</span>
      </h3>
      {topics.length ? (
        <ul className="max-h-40 divide-y divide-ink/10 overflow-y-auto lg:max-h-60">
          {topics.map((topic) => (
            <li key={topic.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 break-words text-ink">{topic.title}</span>
              <span className="shrink-0 text-xs text-ink/70">{topic.count} interested</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pt-2 text-sm text-ink/70">{empty}</p>
      )}
    </section>
  )
}
