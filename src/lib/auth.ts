import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/** `session` is undefined while the stored session / OAuth callback is still being checked. */
export function useSession() {
  const [session, setSession] = useState<Session | null>()
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    // Supabase exchanges the ?code= from the Google redirect itself; this only surfaces failures.
    supabase.auth.initialize().then(({ error }) => {
      if (!error) return
      setAuthError(error.message)
      window.history.replaceState(null, '', window.location.pathname)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, authError }
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    // Must be listed under Authentication → URL Configuration → Redirect URLs.
    options: { redirectTo: window.location.origin + window.location.pathname },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
