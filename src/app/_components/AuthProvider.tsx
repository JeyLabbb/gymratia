'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[AuthProvider] init - fetching session...')
    const timeout = setTimeout(() => {
      console.warn('[AuthProvider] getSession timeout after 8s - forcing loading=false')
      setLoading(false)
    }, 8000)

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(timeout)
        if (error) {
          console.error('[AuthProvider] getSession error:', error)
        }
        console.log('[AuthProvider] session loaded:', !!session?.user, session?.user?.email ?? 'no user')
        setUser(session?.user ?? null)
        setLoading(false)
        console.log('[AuthProvider] loading=false')
      })
      .catch((err) => {
        clearTimeout(timeout)
        console.error('[AuthProvider] getSession failed:', err)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin ? `${origin}/auth/callback` : undefined,
      },
    })
    if (error) throw error
    // Note: User will be redirected to Google, then back to /auth/callback
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

