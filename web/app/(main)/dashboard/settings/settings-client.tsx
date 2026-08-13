"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { SettingsCard } from "@/components/settings/settings-card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import { staggerContainer, staggerItem } from "@/lib/animations"
import { useTranslations } from "next-intl"

export default function SettingsClient() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations("Settings")

  const settingsGroups: { title: string; items: { label: string; href?: string; external?: boolean }[] }[] = [
    {
      title: t("accountAndProfile"),
      items: [
        { label: t("accountAndSecurity"), href: "/dashboard/settings/account" },
      ],
    },
    {
      title: t("membershipTitle"),
      items: [{ label: t("membershipTitle"), href: "/dashboard/settings/membership" }],
    },
    {
      title: t("displayAndLanguage"),
      items: [
        { label: t("language"), href: "/dashboard/settings/language" },
        { label: t("fontSize"), href: "/dashboard/settings/fontsize" },
      ],
    },
    {
      title: t("basics"),
      items: [
        { label: t("notifications"), href: "/dashboard/settings/notification" },
        { label: t("general"), href: "/dashboard/settings/general" },
        { label: t("privacy"), href: "/dashboard/settings/privacy" },
      ],
    },
    {
      title: t("contentAndSocial"),
      items: [
        { label: t("myContent"), href: "/dashboard/settings/content" },
        { label: t("interactionSettings"), href: "/dashboard/settings/interaction" },
      ],
    },
    {
      title: t("other"),
      items: [
        { label: t("aboutUs"), href: "/dashboard/settings/about" },
        { label: t("helpAndFeedback"), href: "/dashboard/settings/feedback" },
      ],
    },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerItem}>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">{t("managePreferences")}</p>
      </motion.div>

      {/* Settings groups */}
      <div className="space-y-3">
        {settingsGroups.map((group) => (
          <motion.div key={group.title} variants={staggerItem}>
            <div className="mb-1.5 px-1 text-[13px] font-medium text-[#9A9A95]">
              {group.title}
            </div>
            <SettingsCard>
              <div>
                {group.items.map((item, idx) => {
                  const isLast = idx === group.items.length - 1
                  const content = (
                    <div
                      className={cn(
                        "flex items-center px-4 py-3.5 transition-colors",
                        !isLast && "border-b border-black/[0.03]",
                        "cursor-pointer hover:bg-white/40",
                      )}
                    >
                      <span className="text-[15px] text-[#111111]">{item.label}</span>
                    </div>
                  )

                  if (item.href) {
                    return (
                      <Link key={item.label} href={item.href}>
                        {content}
                      </Link>
                    )
                  }
                  return <div key={item.label}>{content}</div>
                })}
              </div>
            </SettingsCard>
          </motion.div>
        ))}
      </div>

      {/* Logout button */}
      <motion.button
        type="button"
        onClick={handleLogout}
        whileHover={{ scale: 0.98 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-white/60 bg-white/55 py-3.5 text-[15px] font-medium text-[#FF3B30] backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.03] transition-colors hover:bg-white/70"
      >
        <EmojiIcon name="LogOut" className="size-4" />
        {t("signOut")}
      </motion.button>
    </motion.div>
  )
}
