import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext({
  session: null,
  user: null,
  isAdmin: false,
  authLoading: false,
  signIn: async () => ({ error: new Error('Auth disabled') }),
  signOut: async () => ({ error: new Error('Auth disabled') }),
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
      if (!supabase) {
        console.warn('[Auth] Supabase client missing. Admin login disabled.')
        if (mounted) {
          setSession(null)
          setAuthLoading(false)
        }
        return
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('[Auth] Failed to load session', error)
      }

      if (mounted) {
        setSession(session ?? null)
        setAuthLoading(false)
      }
    }

    initializeSession()

    if (!supabase) {
      return () => {
        mounted = false
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session ?? null)
      }
    })

    return () => {
      mounted = false
      listener?.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => {
    const isAdmin = Boolean(session?.user?.app_metadata?.admin)

    async function signIn(email, password) {
      if (!supabase) {
        return { error: new Error('Supabase not configured') }
      }
      return supabase.auth.signInWithPassword({ email, password })
    }

    async function signOut() {
      if (!supabase) {
        return { error: new Error('Supabase not configured') }
      }
      return supabase.auth.signOut()
    }

    return {
      session,
      user: session?.user ?? null,
      isAdmin,
      authLoading,
      signIn,
      signOut,
    }
  }, [session, authLoading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
