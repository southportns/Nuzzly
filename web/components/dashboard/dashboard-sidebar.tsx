"use client"

import { EmojiIcon, emojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

const navItemKeys = [
  { href: "/dashboard", labelKey: "navOverview", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <path opacity="0.4" d="M14.6729 4.3667C14.6662 4.3594 14.6641 4.3499 14.6571 4.3428C14.6501 4.3357 14.6405 4.3338 14.6333 4.3269C13.1863 2.8899 11.1954 2 8.99991 2C8.03211 2 7.0863 2.1709 6.1889 2.5083C5.8012 2.6543 5.60491 3.08639 5.75041 3.47409C5.89691 3.86279 6.33 4.0581 6.7162 3.9126C7.21 3.7271 7.72611 3.62699 8.24991 3.56689V4.75C8.24991 5.1641 8.58581 5.5 8.99991 5.5C9.41401 5.5 9.74991 5.1641 9.74991 4.75V3.54691C10.9806 3.68921 12.1059 4.1765 13.0297 4.9097L12.1815 5.75781C11.8885 6.05081 11.8885 6.5254 12.1815 6.8183C12.328 6.9648 12.5199 7.03799 12.7118 7.03799C12.9037 7.03799 13.0956 6.9648 13.2421 6.8183L14.0903 5.97021C14.8233 6.89401 15.3108 8.0193 15.453 9.25H14.2499C13.8358 9.25 13.4999 9.5859 13.4999 10C13.4999 10.4141 13.8358 10.75 14.2499 10.75H15.4374C15.2993 11.9541 14.8506 13.0879 14.0966 14.0361L13.2431 13.1826C12.9501 12.8896 12.4755 12.8896 12.1826 13.1826C11.8897 13.4756 11.8896 13.9502 12.1826 14.2431L13.5967 15.6572C13.7432 15.8037 13.9351 15.8769 14.127 15.8769C14.3189 15.8769 14.5108 15.8037 14.6573 15.6572C16.168 14.1465 17.0001 12.1372 17.0001 10C17.0001 7.8044 16.1099 5.8135 14.6729 4.3667Z" fill="currentColor" data-color="color-2" />
      <path opacity="0.4" d="M4.75769 13.1816L3.90419 14.0351C3.14999 13.0866 2.70099 11.9533 2.56259 10.7499H3.74989C4.16399 10.7499 4.49989 10.414 4.49989 9.9999C4.49989 9.5858 4.16399 9.2499 3.74989 9.2499H2.56659C2.62679 8.7262 2.72659 8.20959 2.91209 7.71569C3.05759 7.32749 2.86129 6.8954 2.47359 6.7499C2.08739 6.6034 1.6533 6.80068 1.5078 7.18838C1.1709 8.08628 1 9.03219 1 9.99889C1 9.99869 1 9.99909 1 9.99889V9.99999C1.0004 12.1365 1.8328 14.145 3.3438 15.656C3.4903 15.8025 3.6822 15.8757 3.8741 15.8757C4.066 15.8757 4.25789 15.8025 4.40439 15.656L5.8185 14.2419C6.1115 13.9489 6.1115 13.4743 5.8185 13.1814C5.5255 12.8885 5.05059 12.8886 4.75769 13.1816Z" fill="currentColor" data-color="color-2" />
      <path d="M8.99996 7.99999C8.72306 7.99999 8.45936 8.0566 8.21936 8.1589L4.40326 4.34271C4.11026 4.04971 3.63566 4.04971 3.34276 4.34271C3.04986 4.63571 3.04976 5.11029 3.34276 5.40319L7.15886 9.21938C7.05676 9.45938 6.99996 9.7231 6.99996 9.9999C6.99996 11.1029 7.89696 11.9999 8.99996 11.9999C10.103 11.9999 11 11.1029 11 9.9999C11 8.8969 10.103 7.99999 8.99996 7.99999Z" fill="currentColor" />
    </svg>
  ), exact: true },
  { href: "/dashboard/notifications", labelKey: "navNotifications", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <path d="M15.75 12.75C14.645 12.75 13.75 11.855 13.75 10.75V6.5C13.75 3.877 11.623 1.75 9 1.75C6.377 1.75 4.25 3.877 4.25 6.5V10.75C4.25 11.855 3.355 12.75 2.25 12.75H15.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M10.5 15.3843C10.2005 15.9018 9.6409 16.25 9 16.25C8.3591 16.25 7.7995 15.9018 7.5 15.3843" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" data-color="color-2" fill="none" />
    </svg>
  ) },
  { href: "/dashboard/pets", labelKey: "navMyPets", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <path d="m11.1077,5.1111c.0826-.3533.1423-.717.1423-1.1052.006-1.5139-1.217-2.7468-2.733-2.7559-.912.012-1.76.4709-2.267,1.229-.507-.7571-1.355-1.217-2.267-1.229-1.516.009-2.739,1.2419-2.733,2.7559,0,2.0918,1.3028,3.686,2.579,4.7529" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" data-color="color-2" />
      <path d="m16.75,14.725c0-2.059-.236-3.639-1-4.223-.875-.669-3.152-.838-5.295-.232l-1.33-2.827c-.293-.626-1.037-.896-1.663-.603h0c-.625.292-.896,1.036-.604,1.661l2.561,5.456-2.724-.501c-.587-.108-1.167.224-1.371.785h0c-.232.637.098,1.34.736,1.569l2.616.941" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  ) },
  { href: "/dashboard/followups", labelKey: "navFollowups", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.5 3.75C12.5 2.78349 13.2835 2 14.25 2H14.75C15.7165 2 16.5 2.78349 16.5 3.75V14.25C16.5 15.2165 15.7165 16 14.75 16H14.25C13.2835 16 12.5 15.2165 12.5 14.25V3.75Z" fill="currentColor" fillOpacity="0.4" data-color="color-2" />
      <path fillRule="evenodd" clipRule="evenodd" d="M7 8.75C7 7.78349 7.78349 7 8.75 7H9.25C10.2165 7 11 7.78349 11 8.75V14.25C11 15.2165 10.2165 16 9.25 16H8.75C7.78349 16 7 15.2165 7 14.25V8.75Z" fill="currentColor" fillOpacity="0.4" data-color="color-2" />
      <path fillRule="evenodd" clipRule="evenodd" d="M1.5 12.75C1.5 11.7835 2.28349 11 3.25 11H3.75C4.71651 11 5.5 11.7835 5.5 12.75V14.25C5.5 15.2165 4.71651 16 3.75 16H3.25C2.28349 16 1.5 15.2165 1.5 14.25V12.75Z" fill="currentColor" fillOpacity="0.4" data-color="color-2" />
      <path fillRule="evenodd" clipRule="evenodd" d="M6.25 2C5.83579 2 5.5 2.33579 5.5 2.75C5.5 3.16421 5.83579 3.5 6.25 3.5H6.93934L2.21967 8.21967C1.92678 8.51256 1.92678 8.98744 2.21967 9.28033C2.51256 9.57322 2.98744 9.57322 3.28033 9.28033L8 4.56066V5.25C8 5.66421 8.33579 6 8.75 6C9.16421 6 9.5 5.66421 9.5 5.25V2.75C9.5 2.33579 9.16421 2 8.75 2H6.25Z" fill="currentColor" />
    </svg>
  ) },
  { href: "/dashboard/health", labelKey: "navHealth", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <path d="M9 1.75C5.004 1.75 1.75 5.004 1.75 9S5.004 16.25 9 16.25 16.25 12.996 16.25 9 12.996 1.75 9 1.75Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M9 5.75V12.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M5.75 9H12.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  ) },
  { href: "/dashboard/bookmarks", labelKey: "navBookmarks", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <polygon points="9 1.75 11.24 6.289 16.25 7.017 12.625 10.551 13.481 15.54 9 13.185 4.519 15.54 5.375 10.551 1.75 7.017 6.76 6.289 9 1.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  ) },
  { href: "/dashboard/recommendations", labelKey: "navRecommendations", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <path d="M9,1.75C4.996,1.75,1.75,4.996,1.75,9c0,1.319,.358,2.552,.973,3.617,.43,.806-.053,2.712-.973,3.633,1.25,.068,2.897-.497,3.633-.973,.489,.282,1.264,.656,2.279,.848,.433,.082,.881,.125,1.338,.125,4.004,0,7.25-3.246,7.25-7.25S13.004,1.75,9,1.75Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M5.992,12c.77,.772,1.834,1.25,3.008,1.25s2.231-.475,3-1.242" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" data-color="color-2" />
    </svg>
  ) },
  { href: "/dashboard/settings", labelKey: "navSettings", icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="18px" height="18px" viewBox="0 0 18 18">
      <path d="M14.5,8.25h-5.067L6.899,3.862c-.207-.359-.667-.481-1.024-.274-.359,.207-.481,.666-.274,1.024l2.534,4.388-2.534,4.389c-.207,.359-.084,.817,.274,1.024,.118,.068,.247,.101,.375,.101,.259,0,.511-.134,.65-.375l2.534-4.389h5.067c.414,0,.75-.336,.75-.75s-.336-.75-.75-.75Z" fill="currentColor" data-color="color-2" />
      <path d="M16.25,8.25h-1.049c-.072-.597-.225-1.169-.453-1.702l.906-.523c.359-.207,.481-.666,.274-1.024-.207-.359-.666-.481-1.024-.274l-.913,.527c-.354-.471-.773-.889-1.243-1.243l.527-.914c.207-.359,.084-.817-.274-1.024-.358-.208-.817-.085-1.024,.274l-.523,.906c-.533-.229-1.105-.381-1.702-.453V1.75c0-.414-.336-.75-.75-.75s-.75,.336-.75,.75v1.049c-.597,.072-1.169,.225-1.702,.453l-.523-.906c-.208-.359-.667-.482-1.024-.274-.359,.207-.481,.666-.274,1.024l.527,.914c-.471,.354-.889,.772-1.243,1.243l-.913-.527c-.357-.207-.817-.085-1.024,.274-.207,.359-.084,.817,.274,1.024l.906,.523c-.228,.533-.381,1.105-.453,1.702H1.75c-.414,0-.75,.336-.75,.75s.336,.75,.75,.75h1.049c.072,.597,.225,1.169,.453,1.702l-.906,.523c-.359,.207-.481,.666-.274,1.024,.139,.241,.391,.375,.65,.375,.127,0,.256-.032,.375-.101l.913-.527c.354,.471,.773,.889,1.243,1.243l-.527,.914c-.207,.359-.084,.817,.274,1.024,.118,.068,.247,.101,.375,.101,.259,0,.511-.134,.65-.375l.523-.906c.533,.229,1.105,.381,1.702,.453v1.049c0,.414,.336,.75,.75,.75s.75-.336,.75-.75v-1.049c.597-.072,1.169-.225,1.702-.453l.523,.906c.139,.241,.391,.375,.65,.375.127,0,.256-.032.375-.101.359-.207,.481-.666,.274-1.024l-.527-.914c.471-.354,.889-.772,1.243-1.243l.913,.527c.118,.068,.247,.101,.375,.101.259,0,.511-.134,.65-.375.207-.359,.084-.817-.274-1.024l-.906-.523c.228-.533,.381-1.105,.453-1.702h1.049c.414,0,.75-.336,.75-.75s-.336-.75-.75-.75Zm-7.25,5.5c-2.619,0-4.75-2.131-4.75-4.75s2.131-4.75,4.75-4.75,4.75,2.131,4.75,4.75-2.131,4.75-4.75,4.75Z" fill="currentColor" />
    </svg>
  ) },
]

interface DashboardSidebarProps {
  userId: string
  username: string
  trustScore: number
  email?: string | null
  avatarUrl?: string | null
  userNumber?: string | null
  onEditClick?: () => void
  profile?: {
    review_count?: number | null
    long_term_review_count?: number | null
    verified_purchase_count?: number | null
    behavior_score?: number | null
  } | null
}

function formatUserId(num?: string | null): string {
  if (!num) return "nuzzmily000"
  return `nuzzmily${String(num).padStart(3, "0")}`
}

export function DashboardSidebar({ userId, username, trustScore, email, avatarUrl, userNumber, onEditClick, profile }: DashboardSidebarProps) {
  const pathname = usePathname()
  const t = useTranslations("Dashboard")

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="relative sticky top-[88px] hidden h-fit w-[244px] shrink-0 md:block">
      {/* Profile header card */}
      <div className="overflow-hidden rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white">
        <div className="relative h-[150px] bg-gradient-to-br from-[#FFE4D2] via-[#FFD2BC] to-[#FFB89A] px-5 pb-5 pt-5">
          <button
            type="button"
            onClick={() => onEditClick?.()}
            className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[#FF7A59] shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          >
            {t("edit")}
          </button>
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-white/95 text-[16px] font-bold text-[#FF7A59] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            {avatarUrl ? (
              <div className="relative size-full">
                <Image src={avatarUrl} alt="avatar" fill className="object-cover" sizes="48px" />
              </div>
            ) : (
              (username || email || "U").charAt(0).toUpperCase()
            )}
          </div>
          <h2 className="mt-2 truncate text-[15px] font-semibold text-[#111111]">
            {username || t("defaultUsername")}
          </h2>
          {email ? (
            <p className="truncate text-[11.5px] text-[#6B6B6B]">{email}</p>
          ) : username ? (
            <p className="truncate text-[11.5px] text-[#6B6B6B]">@{username}</p>
          ) : null}
          {userNumber && (
            <p className="truncate text-[11.5px] text-[#9A9A95]" title={formatUserId(userNumber)}>
              ID: {formatUserId(userNumber)}
            </p>
          )}
        </div>
        {/* Trust score */}
        <div className="px-5 pb-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#6B6B6B]">{t("trustScore")}</span>
            <span className="text-[18px] font-bold text-[#FF7A59]">{trustScore}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F0EFED]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FFB89A] to-[#FF7A59] transition-all"
              style={{ width: `${Math.max(0, Math.min(100, trustScore))}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#6B6B6B]">
            <span>{t("statReviews")}: {profile?.review_count ?? 0}</span>
            <span>{t("statTracking")}: {profile?.long_term_review_count ?? 0}</span>
            <span>{t("statVerified")}: {profile?.verified_purchase_count ?? 0}</span>
            <span>{t("statBehavior")}: {profile?.behavior_score ?? 100}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-4 rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-2">
        {navItemKeys.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[13.5px] font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-[#FFB89A]/14 to-[#FF7A59]/14 text-[#111111] shadow-[inset_0_0_0_1px_rgba(255,122,89,0.18)]"
                  : "text-[#444444] hover:bg-[#F7F6F3] hover:text-[#111111]"
              )}
            >
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex size-4 items-center justify-center transition-colors [&_svg]:size-full",
                      active ? "text-[#FF7A59]" : "text-[#6B6B6B] group-hover:text-[#111111]"
                    )}
                  >
                    <item.icon />
                  </span>
                  {t(item.labelKey)}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function DashboardMobileNav() {
  const pathname = usePathname()
  const t = useTranslations("Dashboard")

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="sticky top-[72px] z-30 -mx-6 mb-4 flex w-[calc(100%+3rem)] gap-1 overflow-x-auto border-b border-[rgba(0,0,0,0.05)] bg-[#F7F6F3]/80 px-6 py-2 backdrop-blur md:hidden">
      {navItemKeys.map((item) => {
        const active = isActive(item.href, item.exact)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              active
                ? "bg-[#FF7A59]/12 text-[#111111]"
                : "text-[#6B6B6B] hover:bg-white hover:text-[#111111]"
            )}
          >
            <span className={cn("inline-flex size-3.5 items-center justify-center [&_svg]:size-full", active ? "text-[#FF7A59]" : "")}>
              <item.icon />
            </span>
            {t(item.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
