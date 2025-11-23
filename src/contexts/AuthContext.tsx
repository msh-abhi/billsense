import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Profile {
  id: string
  email: string
  full_name?: string
  company_id?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string, companyName?: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    console.log('[AuthContext] fetchProfile called for:', userId)
    try {
      // Create a promise that rejects after 5 seconds (increased from 3)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      )

      // Wrap the Supabase call in a real Promise
      const fetchPromise = (async () => {
        // 1. Try to fetch from profiles (for regular users)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, company_id')
          .eq('id', userId)
          .maybeSingle()

        if (profileError) throw profileError
        if (profileData) return profileData

        // 2. If not found, try to fetch from client_users (for client portal users)
        const { data: clientData, error: clientError } = await supabase
          .from('client_users')
          .select('id, email, client_id')
          .eq('id', userId)
          .maybeSingle()

        if (clientError) throw clientError
        if (clientData) {
          // Return a profile-like object for client users
          return {
            id: clientData.id,
            email: clientData.email,
            full_name: 'Client User', // We could fetch this from clients table if needed
            company_id: undefined // Client users don't have a company_id in the same way
          }
        }

        return null
      })()

      const data = await Promise.race([fetchPromise, timeoutPromise]) as any

      console.log('[AuthContext] Profile fetched successfully:', !!data)
      return data
    } catch (error) {
      console.error('[AuthContext] Error in fetchProfile:', error)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const data = await fetchProfile(user.id)
      setProfile(data)
    }
  }

  useEffect(() => {
    let mounted = true
    // We use a flag to track if we've already handled the initial load to avoid double-fetching
    let initComplete = false

    console.log('[AuthContext] Setting up auth listener...')

    // 1. Setup listener immediately
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] onAuthStateChange:', event, session?.user?.id)

      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        // Only fetch profile if we haven't done it yet or if the user changed
        console.log('[AuthContext] Auth change: Fetching profile...')
        const profileData = await fetchProfile(session.user.id)
        if (mounted) setProfile(profileData)
      } else {
        if (mounted) setProfile(null)
      }

      // If this fires, we can consider loading done
      if (mounted) {
        console.log('[AuthContext] Auth change: Setting loading=false')
        setLoading(false)
        initComplete = true
      }
    })

    // 2. Safety timeout in case onAuthStateChange doesn't fire (rare but possible)
    const timeoutId = setTimeout(() => {
      if (mounted && !initComplete) {
        console.warn('[AuthContext] Auth listener timeout: forcing loading=false')
        setLoading(false)
        initComplete = true
      }
    }, 4000)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string, companyName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        },
      },
    })

    if (data.user && !error) {
      try {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          company_name: companyName || null,
        })
        const profileData = await fetchProfile(data.user.id)
        setProfile(profileData)
      } catch (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }

    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}