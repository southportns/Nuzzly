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
    // Track the last uid we loaded profile for, to avoid duplicate
    // fetches from initializeAuth + onAuthStateChange firing in parallel
    let lastLoadedUid: string | undefined | null = "__UNINIT__"

    const loadProfile = async (uid: string | undefined) => {
      if (!uid) {
        setIsAdmin(false)
        lastLoadedUid = undefined
        return
      }
      if (uid === lastLoadedUid) return
      lastLoadedUid = uid
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
        const { data: { user: authUser }, error } = await supabase.auth.getUser()

        if (!mounted) return

        // If getUser() returns an error (e.g. refresh token is invalid/expired),
        // clear the stale local session so it doesn't keep retrying.
        if (error) {
          await supabase.auth.signOut({ scope: "local" })
          setUser(null)
          setIsAdmin(false)
          setLoading(false)
          return
        }

        setUser(authUser ?? null)
        await loadProfile(authUser?.id)
        setLoading(false)
      } catch (error) {
        console.error("Auth initialization failed:", error)
        // Clear stale session on any unexpected auth error
        try {
          await supabase.auth.signOut({ scope: "local" })
        } catch {}
        if (mounted) {
          setUser(null)
          setIsAdmin(false)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the initial session event — initializeAuth already handles it
      if (event === "INITIAL_SESSION") return

      // When the token refresh fails, clear the stale local session
      // to prevent repeated refresh attempts on every page load.
      // Use setTimeout to avoid calling auth methods synchronously
      // inside onAuthStateChange (can cause Supabase SDK deadlocks).
      if ((event as string) === "TOKEN_REFRESH_FAILED") {
        setTimeout(() => {
          supabase.auth.signOut({ scope: "local" }).catch(() => {})
        }, 0)
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
        return
      }

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
      // Global signOut failed (e.g. refresh token already invalid) —
      // fall back to local signOut to clear stale cookies.
      try {
        await supabaseRef.current.auth.signOut({ scope: "local" })
      } catch {}
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
