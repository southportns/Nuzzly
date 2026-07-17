import { redirect } from "next/navigation"
import { getUser } from "@/lib/supabase/query"
import AccountSettings from "./account-settings"
import MembershipSettings from "./membership-settings"
import LanguageSettings from "./language-settings"
import FontSizeSettings from "./fontsize-settings"
import NotificationSettings from "./notification-settings"
import GeneralSettings from "./general-settings"
import PrivacySettings from "./privacy-settings"
import ContentSettings from "./content-settings"
import InteractionSettings from "./interaction-settings"
import AboutSettings from "./about-settings"
import FeedbackSettings from "./feedback-settings"

export const metadata = {
  title: "设置 — Nuzzly毛球镇",
}

const validCategories = [
  "account",
  "membership",
  "language",
  "fontsize",
  "notification",
  "general",
  "privacy",
  "content",
  "interaction",
  "about",
  "feedback",
]

export default async function SettingsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  if (!validCategories.includes(category)) {
    redirect("/dashboard/settings")
  }

  const componentMap = {
    account: <AccountSettings user={user} />,
    membership: <MembershipSettings />,
    language: <LanguageSettings />,
    fontsize: <FontSizeSettings />,
    notification: <NotificationSettings />,
    general: <GeneralSettings />,
    privacy: <PrivacySettings />,
    content: <ContentSettings />,
    interaction: <InteractionSettings />,
    about: <AboutSettings />,
    feedback: <FeedbackSettings />,
  }

  return componentMap[category as keyof typeof componentMap]
}
