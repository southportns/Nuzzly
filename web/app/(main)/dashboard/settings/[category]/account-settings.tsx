"use client"

import { FluentEmoji, FLUENT_EMOJI } from "@/components/ui/fluent-emoji"
import { SettingsCard } from "@/components/settings/settings-card"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

interface AccountSettingsProps {
  user: User
}

export default function AccountSettings({ user }: AccountSettingsProps) {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [userNumber, setUserNumber] = useState<number | null>(null)

  // Fetch user_number from public_profiles
  useEffect(() => {
    async function fetchUserNumber() {
      const { data } = await supabase
        .from("public_profiles")
        .select("user_number")
        .eq("id", user.id)
        .single()
      if (data) setUserNumber(data.user_number)
    }
    fetchUserNumber()
  }, [supabase, user.id])

  const handleChangePassword = async () => {
    if (saving) return
    if (!password || password.length < 6) {
      alert("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      alert("Password updated")
      setPassword("")
      setConfirmPassword("")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed"
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleting || deleteConfirmText !== "DELETE") return

    setDeleting(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error("Not signed in")

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("profiles")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id)

      await supabase.auth.signOut()
      alert("Account deleted")
      setShowDeleteConfirm(false)
      setDeleteConfirmText("")
      router.push("/login")
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Deletion failed, please contact support"
      alert(msg)
    } finally {
      setDeleting(false)
    }
  }

  const inputClassName =
    "w-full rounded-[12px] border border-white/60 bg-white/50 px-3.5 py-2.5 text-[15px] text-[#111111] backdrop-blur-xl outline-none transition-all focus:border-[#FF7A59]/40 focus:bg-white/80 focus:shadow-[0_0_0_3px_rgba(255,122,89,0.08)]"

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div variants={staggerItem}>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          Account & Security
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">Manage your account information</p>
      </motion.div>

      {/* ── Account info ── */}
      <motion.div variants={staggerItem}>
        <div className="mb-1.5 px-1 text-[13px] font-medium text-[#9A9A95]">
          Account Info
        </div>
        <SettingsCard>
          {/* Email row */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <FluentEmoji src={FLUENT_EMOJI.email} alt="email" size={16} />
              <span className="text-[15px] text-[#111111]">Email</span>
            </div>
            <span className="truncate pl-3 text-[14px] text-[#9A9A95]">
              {user.email || "Not signed in"}
            </span>
          </div>
          {/* Divider */}
          <div className="mx-4 border-t border-black/[0.03]" />
          {/* User ID row */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <FluentEmoji src={FLUENT_EMOJI.idCard} alt="id card" size={16} />
              <span className="text-[15px] text-[#111111]">User ID</span>
            </div>
            <span className="truncate pl-3 text-[14px] text-[#9A9A95]">
              nuzzmily{String(userNumber ?? 0).padStart(3, "0")}
            </span>
          </div>
        </SettingsCard>
      </motion.div>

      {/* ── Password ── */}
      <motion.div variants={staggerItem}>
        <div className="mb-1.5 px-1 text-[13px] font-medium text-[#9A9A95]">
          Security
        </div>
        <SettingsCard>
          <div className="space-y-3 p-4">
            <div>
              <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] text-[#6B6B6B]">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={inputClassName}
              />
            </div>
            <motion.button
              onClick={handleChangePassword}
              disabled={saving || !password || !confirmPassword}
              whileHover={{ scale: 0.98 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-full rounded-full bg-[#FF7A59] py-3 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(255,122,89,0.25)] transition-colors hover:bg-[#E86A4A] disabled:opacity-40 disabled:shadow-none"
            >
              {saving ? "Updating..." : "Update Password"}
            </motion.button>
          </div>
        </SettingsCard>
      </motion.div>

      {/* ── Danger zone ── */}
      <motion.div variants={staggerItem}>
        <div className="mb-1.5 px-1 text-[13px] font-medium text-[#9A9A95]">
          Danger Zone
        </div>
        <SettingsCard className="border-[#FF3B30]/15">
          <div className="p-4">
            <div className="mb-3 flex items-start gap-2 rounded-[12px] bg-[#FF3B30]/[0.06] p-3">
              <FluentEmoji src={FLUENT_EMOJI.warning} alt="warning" size={16} className="shrink-0" />
              <span className="text-[13px] leading-relaxed text-[#FF3B30]">
                After account deletion, all data will be permanently deleted and cannot be recovered
              </span>
            </div>
            <motion.button
              onClick={() => setShowDeleteConfirm(true)}
              whileHover={{ scale: 0.98 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="w-full rounded-full border border-[#FF3B30]/20 bg-transparent py-3 text-[15px] font-semibold text-[#FF3B30] transition-colors hover:bg-[#FF3B30]/5"
            >
              Delete Account
            </motion.button>
          </div>
        </SettingsCard>
      </motion.div>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-md"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[340px] overflow-hidden rounded-[24px] border border-white/60 bg-white/85 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15),0_8px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.03]"
            >
              {/* Warning icon */}
              <div className="flex justify-center pt-7">
                <div className="flex size-14 items-center justify-center rounded-full bg-[#FF3B30]/10">
                  <FluentEmoji src={FLUENT_EMOJI.warning} alt="warning" size={28} />
                </div>
              </div>

              <div className="px-7 pb-7 pt-4 text-center">
                <h3 className="text-[18px] font-bold text-[#111111]">
                  Confirm Account Deletion?
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#6B6B6B]">
                  This action will permanently delete your account and all associated data, including pet profiles, reviews, health records, etc., and
                  <strong className="text-[#FF3B30]"> cannot be recovered</strong>.
                </p>

                <div className="mt-4 text-left">
                  <label className="mb-1.5 block text-[12px] text-[#6B6B6B]">
                    Please type{" "}
                    <strong className="text-[#111111]">DELETE</strong>{" "}
                    to confirm
                  </label>
                  <input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full rounded-[12px] border border-white/60 bg-white/50 px-3.5 py-2.5 text-[15px] text-[#111111] backdrop-blur-xl outline-none transition-all focus:border-[#FF3B30]/40 focus:bg-white/80 focus:shadow-[0_0_0_3px_rgba(255,59,48,0.08)]"
                  />
                </div>

                <div className="mt-5 flex gap-2.5">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText("")
                    }}
                    className="flex-1 rounded-full border border-black/[0.06] bg-white/50 py-3 text-[15px] font-semibold text-[#111111] backdrop-blur-xl transition-colors hover:bg-white/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "DELETE" || deleting}
                    className="flex-1 rounded-full bg-[#FF3B30] py-3 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(255,59,48,0.2)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
