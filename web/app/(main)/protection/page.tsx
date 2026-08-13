import { EmojiIcon } from "@/components/ui/emoji-icon"
import { LoginButton } from "@/components/auth/login-button"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Protection")
  return { title: `${t("title")} — Nuzzly Town` }
}

export default async function ProtectionPage() {
  const t = await getTranslations("Protection")

  const features = [
    {
      iconName: "AlertTriangle",
      title: t("featureRiskAlert.title"),
      description: t("featureRiskAlert.description"),
      status: t("statusLive"),
      statusKey: "live",
    },
    {
      iconName: "Clock",
      title: t("featureLongTermTracking.title"),
      description: t("featureLongTermTracking.description"),
      status: t("statusLive"),
      statusKey: "live",
    },
    {
      iconName: "FileCheck",
      title: t("featureReceiptVerification.title"),
      description: t("featureReceiptVerification.description"),
      status: t("statusInDev"),
      statusKey: "dev",
    },
    {
      iconName: "Users",
      title: t("featureTrustedTiers.title"),
      description: t("featureTrustedTiers.description"),
      status: t("statusLive"),
      statusKey: "live",
    },
    {
      iconName: "Bell",
      title: t("featureRecipeTracking.title"),
      description: t("featureRecipeTracking.description"),
      status: t("statusInDev"),
      statusKey: "dev",
    },
    {
      iconName: "ShieldCheck",
      title: t("featureTransparencyIndex.title"),
      description: t("featureTransparencyIndex.description"),
      status: t("statusPlanned"),
      statusKey: "planned",
    },
  ]

  const principles = [
    {
      iconName: "BarChart3",
      title: t("principleNoVerdicts.title"),
      description: t("principleNoVerdicts.description"),
    },
    {
      iconName: "Ban",
      title: t("principleAntiFraud.title"),
      description: t("principleAntiFraud.description"),
    },
    {
      iconName: "Lock",
      title: t("principlePrivacy.title"),
      description: t("principlePrivacy.description"),
    },
  ]

  return (
    <div className="bg-[#F7F6F3]">
      <div className="mx-auto max-w-[1440px] px-6 py-8 md:px-12 md:py-10">
        {/* ========== Hero ========== */}
        <div className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF7A59]">
            {t("badge")}
          </span>
          <h1 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-[-0.04em] text-[#111111] md:text-[40px]">
            {t("title")}
          </h1>
          <p className="mx-auto mt-2 max-w-[640px] text-[14px] leading-[1.7] text-[#6B6B6B] md:text-[15px]">
            {t("subtitle")}
          </p>
        </div>

        {/* ========== Main: Features (left) + Principles (right) ========== */}
        <div className="mt-6 grid gap-5 md:grid-cols-12 md:gap-6">
          {/* Left — Features 2-col x 3-row */}
          <div className="md:col-span-8">
            <div className="grid h-full gap-3 md:grid-cols-2 md:gap-4">
              {features.map((f) => (
                  <div
                    key={f.title}
                    className="rounded-[20px] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-[#FF7A59]/10">
                        <EmojiIcon name={f.iconName} className="size-5 text-[#FF7A59]" />
                      </div>
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-medium " +
                          (f.statusKey === "live"
                            ? "bg-[#A8C5A0]/20 text-[#5A8A50]"
                            : f.statusKey === "dev"
                            ? "bg-[#E8A87C]/20 text-[#C47A3C]"
                            : "bg-[#F0EFED] text-[#6B6B6B]")
                        }
                      >
                        {f.status}
                      </span>
                    </div>
                    <h3 className="mt-3 text-[15px] font-bold text-[#111111]">{f.title}</h3>
                    <p className="mt-0.5 text-[12.5px] leading-[1.6] text-[#6B6B6B]">
                      {f.description}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* Right — Principles + CTA */}
          <div className="md:col-span-4">
            <div className="flex h-full flex-col rounded-[24px] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
              {/* Centered title block */}
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF7A59]">
                  {t("principlesBadge")}
                </span>
                <h2 className="mt-1 text-[15px] font-bold tracking-[-0.01em] text-[#111111]">
                  {t("principlesTitle")}
                </h2>
              </div>

              {/* 3 principles evenly distributed in flex-1 space */}
              <div className="mt-5 flex flex-1 flex-col justify-between gap-3.5">
                {principles.map((p) => (
                    <div
                      key={p.title}
                      className="group flex items-center gap-3 rounded-[14px] bg-gradient-to-br from-[#FF7A59]/[0.07] to-[#FF7A59]/[0.01] p-3 ring-1 ring-[#FF7A59]/[0.08] transition-all hover:ring-[#FF7A59]/20"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7A59]/15 to-[#FF7A59]/4 ring-1 ring-[#FF7A59]/10 transition-transform group-hover:scale-105">
                        <EmojiIcon name={p.iconName} className="size-[18px] text-[#FF7A59]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[12.5px] font-bold leading-[1.3] text-[#111111]">
                          {p.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] leading-[1.5] text-[#6B6B6B]">
                          {p.description}
                        </p>
                      </div>
                    </div>
                ))}
              </div>

              {/* CTA */}
              <div className="pt-3">
                <LoginButton className="flex h-[40px] w-full items-center justify-center rounded-full bg-[#FF7A59] text-[13px] font-semibold text-white transition-colors hover:bg-[#E86A4A]">
                  {t("joinPlan")}
                </LoginButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
