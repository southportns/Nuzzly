"use client"

import { createClient } from "@/lib/supabase/client"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { User } from "@supabase/supabase-js"

interface AuthContextValue {
  user: User | null
  isAdmin: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
})

let supabaseSingleton: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!supabaseSingleton) {
    supabaseSingleton = createClient()
  }
  return supabaseSingleton
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(getSupabaseClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    let mounted = true

    const loadProfile = async (uid: string | undefined) => {
      if (!uid) {
        setIsAdmin(false)
        return
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", uid)
          .single()
        if (mounted) {
          setIsAdmin(Boolean((data as { is_admin?: boolean } | null)?.is_admin))
        }
      } catch (error) {
        console.error("Failed to load profile:", error)
      }
    }

    const initializeAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!mounted) return

        setUser(authUser ?? null)
        await loadProfile(authUser?.id)
        setLoading(false)
      } catch (error) {
        console.error("Auth initialization failed:", error)
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      await loadProfile(session?.user?.id)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await supabaseRef.current.auth.signOut({ scope: "global" })
    } catch {
      // Network error — still redirect to clear local session
    }
    window.location.href = "/"
  }, [])

  const value = useMemo(
    () => ({ user, isAdmin, loading, signOut }),
    [user, isAdmin, loading, signOut]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
