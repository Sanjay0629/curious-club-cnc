import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Topic = {
  id: string
  title: string
  category: string
  count: number
  addedAt: number
  interested: boolean
}

type TopicRow = {
  id: string
  title: string
  created_at: string
  interest_count: number
  interested: boolean
}

// The schema has no categories, so every topic gets the label the UI already used for community-added ones.
const toTopic = (row: TopicRow): Topic => ({
  id: row.id,
  title: row.title,
  category: 'Community',
  count: row.interest_count,
  addedAt: Date.parse(row.created_at),
  interested: row.interested,
})

/** Same normalized form the database enforces (topics_title_normalized). */
export const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ')

export async function createTopic(title: string) {
  const { error } = await supabase.from('topics').insert({ title: normalizeTitle(title) })
  return error
}

export async function addInterest(topicId: string) {
  const { error } = await supabase.from('topic_votes').insert({ topic_id: topicId })
  return error
}

// supabase.channel() returns an existing channel with the same name, which breaks StrictMode remounts.
let channelCount = 0

export function useTopics(userId: string | undefined) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from('topics_with_interest')
      .select('id, title, created_at, interest_count, interested')
      .order('created_at', { ascending: false })
    if (error) return setStatus('error')
    setTopics((data as TopicRow[]).map(toTopic))
    setStatus('ready')
  }, [])

  const retry = () => {
    setStatus('loading')
    reload()
  }

  useEffect(() => {
    if (!userId) return
    setStatus('loading')
    reload()
    // ponytail: refetches the whole list on any change; patch rows from the payload if traffic grows.
    const channel = supabase
      .channel(`topics-${++channelCount}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topics' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topic_votes' }, reload)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, reload])

  return { topics, setTopics, status, reload, retry }
}
