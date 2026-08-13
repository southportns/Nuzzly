import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("About")
  return { title: `${t("title")} — Nuzzly Town` }
}

export default async function AboutPage() {
  const t = await getTranslations("About")

  const values = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-[#FF7A59]">
          <rect x="2.75" y="2.75" width="4.5" height="12.5" rx="1.5" ry="1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <rect x="10.75" y="8.75" width="4.5" height="6.5" rx="1.5" ry="1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      ),
      title: t("valueDataDriven"),
      description: t("valueDataDrivenDesc"),
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-[#FF7A59]">
          <path d="M12.955,3.741c.204,.033,.414-.022,.577-.149l.153-.119c-1.264-1.073-2.898-1.722-4.685-1.722C5.838,1.75,3.156,3.778,2.165,6.601c.682,1.534,1.562,2.732,2.649,3.526l.238,.169c.089,.062,.176,.123,.26,.185,.008,.006,.016,.012,.023,.018,.294,.22,.549,.461,.678,.819.094,.262,.083,.47,.068,.733-.021,.393-.049,.881.292,1.447.313,.52,.718,.733,1.014,.889.226,.119,.33,.178,.426,.323.279,.418,.139,1.06,.066,1.316-.012,.043-.024,.082-.037,.125.378,.061,.762,.101,1.157,.101,3.08,0,5.705-1.924,6.756-4.634-.483-1.093-1.095-1.707-1.865-1.853-.814-.154-1.425,.274-1.918,.618-.416,.289-.686,.468-.959,.413-.157-.029-.231-.102-.48-.401-.232-.278-.55-.66-1.092-.978-.881-.516-1.975-.648-3.259-.395-.127-.359-.222-.881,.022-1.376.053-.107,.343-.65,.871-.796.418-.116,.823,.082,1.249,.291.477,.234,1.129,.554,1.759,.154.706-.45,.629-1.294,.567-1.973-.045-.49-.096-1.046,.124-1.32.271-.339,1.067-.434,2.181-.259Z" fill="currentColor" />
          <path d="M9,17c-4.411,0-8-3.589-8-8S4.589,1,9,1s8,3.589,8,8-3.589,8-8,8Zm0-14.5c-3.584,0-6.5,2.916-6.5,6.5s2.916,6.5,6.5,6.5,6.5-2.916,6.5-6.5-2.916-6.5-6.5-6.5Z" fill="currentColor" />
        </svg>
      ),
      title: t("valueTransparent"),
      description: t("valueTransparentDesc"),
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-[#FF7A59]">
          <path d="M5.75 8.25049C6.8546 8.25049 7.75 7.35549 7.75 6.25049C7.75 5.14549 6.8546 4.25049 5.75 4.25049C4.6454 4.25049 3.75 5.14549 3.75 6.25049C3.75 7.35549 4.6454 8.25049 5.75 8.25049Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M9.60903 15.1225C10.132 14.9475 10.439 14.3785 10.245 13.8635C9.56003 12.0455 7.80903 10.7515 5.75103 10.7515C3.69303 10.7515 1.94203 12.0455 1.25703 13.8635C1.06303 14.3795 1.37003 14.9485 1.89303 15.1225C2.85503 15.4435 4.17403 15.7505 5.75203 15.7505C7.33003 15.7505 8.64803 15.4435 9.60903 15.1225Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M12 5.75049C13.1046 5.75049 14 4.85549 14 3.75049C14 2.64549 13.1046 1.75049 12 1.75049C10.8954 1.75049 10 2.64549 10 3.75049C10 4.85549 10.8954 5.75049 12 5.75049Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M13.154 13.1873C14.2224 13.0845 15.1437 12.8614 15.858 12.6226C16.381 12.4476 16.688 11.8785 16.494 11.3636C15.809 9.54549 14.058 8.2515 12 8.2515C11.1608 8.2515 10.379 8.4771 9.69287 8.8555" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      ),
      title: t("valueCommunity"),
      description: t("valueCommunityDesc"),
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" className="text-[#FF7A59]">
          <path d="M10.496,9.757c.164,.467,.254,.97,.254,1.493,0,2.485-2.015,4.5-4.5,4.5S1.75,13.735,1.75,11.25c0-.911,.271-1.759,.736-2.467" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M11.511,15.745c.531,.028,1.076-.038,1.612-.209,2.367-.758,3.671-3.291,2.913-5.658s-3.291-3.671-5.658-2.913c-.868,.278-1.592,.794-2.125,1.453" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M8.156,11.171c-.461-.088-.917-.251-1.35-.492-2.17-1.211-2.947-3.952-1.736-6.123s3.952-2.947,6.123-1.736c.711,.397,1.272,.958,1.663,1.609" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      ),
      title: t("valuePetsFirst"),
      description: t("valuePetsFirstDesc"),
    },
  ]

  const stats = [
    { value: "50,000+", label: t("statUsers") },
    { value: "1,200,000+", label: t("statDataPoints") },
    { value: "4.8 / 5", label: t("statTrustScore") },
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

        {/* ========== Main: Values (left) + Mission (right) ========== */}
        <div className="mt-6 grid gap-5 md:grid-cols-12 md:gap-6">
          {/* Left — Values 2x2 */}
          <div className="md:col-span-7">
            <div className="grid h-full gap-3 md:grid-cols-2 md:gap-4">
              {values.map((v) => (
                  <div
                    key={v.title}
                    className="flex flex-col items-center justify-center gap-3 rounded-[20px] bg-white p-5 text-center shadow-[0_8px_40px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A59]/10">
                      {v.icon}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#111111]">{v.title}</h3>
                      <p className="mt-1 text-[12.5px] leading-[1.6] text-[#6B6B6B]">
                        {v.description}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Right — Mission + Stats + CTAs */}
          <div className="md:col-span-5">
            <div className="flex h-full flex-col rounded-[24px] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A59]/10">
                  <EmojiIcon name="ShieldCheck" className="size-5 text-[#FF7A59]" />
                </div>
                <h2 className="text-[18px] font-bold text-[#111111]">{t("mission")}</h2>
              </div>

              <p className="mt-3 text-[13px] leading-[1.7] text-[#6B6B6B]">
                {t("missionText")}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#F0EFED] pt-4">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-[17px] font-bold leading-none text-[#111111]">
                      {s.value}
                    </div>
                    <div className="mt-1.5 text-[11px] text-[#6B6B6B]">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-5">
                <Button
                  asChild
                  className="h-[40px] rounded-full bg-[#FF7A59] px-5 text-[13px] font-semibold text-white hover:bg-[#E86A4A]"
                >
                  <Link href="/products">{t("browseProducts")}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-[40px] rounded-full px-5 text-[13px] font-medium"
                >
                  <Link href="/ai">{t("askPomiAI")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
