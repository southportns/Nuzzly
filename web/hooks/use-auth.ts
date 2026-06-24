"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async (uid: string | undefined) => {
      if (!uid) {
        setIsAdmin(false)
        return
      }
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", uid)
        .single()
      setIsAdmin(Boolean((data as { is_admin?: boolean } | null)?.is_admin))
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
      void loadProfile(data.user?.id)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      void loadProfile(session?.user?.id)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" })
    } catch {
      // Network error — still redirect to clear local session
    }
    window.location.href = "/"
  }

  return { user, isAdmin, loading, signOut }
}
