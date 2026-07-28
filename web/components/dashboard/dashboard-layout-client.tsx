"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { DashboardSidebar, DashboardMobileNav } from "@/components/dashboard/dashboard-sidebar"
import { ProfileEditPanel } from "@/components/dashboard/profile-edit-panel"

interface DashboardLayoutClientProps {
  children: React.ReactNode
  userId: string
  username: string
  trustScore: number
  email?: string | null
  avatarUrl?: string | null
  userNumber?: string | null
  profile?: {
    review_count?: number | null
    long_term_review_count?: number | null
    verified_purchase_count?: number | null
    behavior_score?: number | null
  } | null
}

export function DashboardLayoutClient({
  children,
  userId,
  username,
  trustScore,
  email,
  avatarUrl,
  userNumber,
  profile,
}: DashboardLayoutClientProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F7F6F3]">
      <div className="mx-auto flex w-[90%] max-w-[1900px] gap-8 py-10">
        <DashboardSidebar
          userId={userId}
          username={username}
          trustScore={trustScore}
          email={email}
          avatarUrl={avatarUrl}
          userNumber={userNumber}
          onEditClick={() => setEditing(true)}
          profile={profile}
        />
        <DashboardMobileNav />
        <main className="min-w-0 flex-1">
          <AnimatePresence mode="popLayout">
            {editing && (
              <motion.div
                key="profile-edit-panel"
                layout
                initial={{ opacity: 0, height: 0, scale: 0.96, y: -24 }}
                animate={{ opacity: 1, height: "auto", scale: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.96, y: -24 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                className="mb-8 overflow-hidden"
              >
                <ProfileEditPanel
                  userId={userId}
                  email={email}
                  initialAvatarUrl={avatarUrl}
                  onClose={() => setEditing(false)}
                  onUpdated={() => {
                    setEditing(false)
                    router.refresh()
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {children}
        </main>
      </div>
    </div>
  )
}
