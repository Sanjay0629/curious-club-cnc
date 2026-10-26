import { Plus } from 'lucide-react'
import type { Topic } from '../data/topics'

type Props = {
  topic: Topic
  index: number
  onInterest: (id: string) => void
}

export function TopicCard({ topic, index, onInterest }: Props) {
  return (
    <article className="flex items-center gap-4 border border-ink/15 bg-card px-4 py-3 transition duration-300 hover:border-plum/40 hover:shadow-[0_12px_30px_rgba(85,51,74,0.08)] sm:px-5">
      <span className="w-10 shrink-0 font-serif text-sm italic text-gold-dark" aria-hidden="true">
        № {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="break-words font-serif text-lg leading-snug text-plum">{topic.title}</h3>
        <p className="mt-0.5 text-xs text-ink/70">
          <strong className="font-semibold text-ink">{topic.count}</strong> {topic.count === 1 ? 'person' : 'people'} interested
          {topic.count >= 100 && (
            <span className="ml-2 border-l border-gold/70 pl-2 font-semibold uppercase tracking-widest text-gold-dark">
              Popular
            </span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onInterest(topic.id)}
        disabled={topic.interested}
        className="inline-flex shrink-0 items-center gap-1.5 border border-plum/35 px-3 py-2 text-xs font-semibold text-plum transition hover:bg-plum hover:text-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum disabled:cursor-default disabled:border-plum/35 disabled:bg-mauve/10 disabled:text-plum/80"
      >
        <Plus size={13} strokeWidth={1.8} aria-hidden="true" />
        {topic.interested ? 'Interested' : "I'm interested"}
      </button>
    </article>
  )
}
