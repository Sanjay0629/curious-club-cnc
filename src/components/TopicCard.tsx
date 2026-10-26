import { Plus } from 'lucide-react'
import type { Topic } from '../data/topics'

type Props = {
  topic: Topic
  index: number
  interested: boolean
  onInterest: (id: string) => void
}

export function TopicCard({ topic, index, interested, onInterest }: Props) {
  return (
    <article className="group relative flex min-h-44 flex-col justify-between border border-ink/15 bg-card p-5 transition duration-300 hover:-translate-y-0.5 hover:border-plum/40 hover:shadow-[0_12px_30px_rgba(85,51,74,0.08)] sm:p-6">
      <div>
        <div className="mb-5 flex items-start justify-between gap-4">
          <span className="label">{topic.category}</span>
          <span className="font-serif text-sm italic text-gold-dark" aria-hidden="true">
            № {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <h3 className="max-w-[28rem] font-serif text-[1.35rem] leading-snug text-plum">{topic.title}</h3>
      </div>
      <div className="mt-6 flex items-end justify-between gap-4 border-t border-ink/10 pt-4">
        <p className="text-xs text-ink/70">
          <strong className="font-semibold text-ink">{topic.count}</strong> people interested
          {topic.count >= 100 && (
            <span className="ml-2 border-l border-gold/70 pl-2 font-semibold uppercase tracking-widest text-gold-dark">
              Popular
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => onInterest(topic.id)}
          disabled={interested}
          className="inline-flex shrink-0 items-center gap-1.5 border border-plum/35 px-3 py-2 text-xs font-semibold text-plum transition hover:bg-plum hover:text-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum disabled:cursor-default disabled:border-plum/35 disabled:bg-mauve/10 disabled:text-plum/80"
        >
          <Plus size={13} strokeWidth={1.8} aria-hidden="true" />
          {interested ? 'Interested' : "I'm interested"}
        </button>
      </div>
    </article>
  )
}
