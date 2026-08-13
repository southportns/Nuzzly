import { EmojiIcon } from "@/components/ui/emoji-icon"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getUser, queryBookmarks } from "@/lib/supabase/query"
import { getTranslations } from "next-intl/server"
import { getLocale } from "next-intl/server"

export const metadata = {
  title: "My Bookmarks — Nuzzly Town",
}

export default async function BookmarksPage() {
  const { data: { user } } = await getUser()
  if (!user) redirect("/login")

  const t = await getTranslations("Bookmarks")
  const tPet = await getTranslations("Pet")
  const locale = await getLocale()

  const { data: bookmarksRaw } = await queryBookmarks(user.id)
  const bookmarks = (bookmarksRaw ?? []) as Array<{
    product_id: string
    created_at: string
    products: {
      name: string
      brand: string
      applicable_species: string | null
    }
  }>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">{t("subtitle")}</p>
      </div>

      {bookmarks && bookmarks.length > 0 ? (
        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {bookmarks.map((b) => (
              <Link
                key={b.product_id}
                href={`/products/${b.product_id}`}
                className="group rounded-[16px] border border-transparent bg-[#F7F6F3] p-4 transition-all hover:border-[rgba(0,0,0,0.06)] hover:bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
              >
                <div className="flex aspect-[4/3] items-center justify-center rounded-[14px] bg-white">
                  <EmojiIcon name="Heart" className="size-8 text-[#D2D1CF]" />
                </div>
                <div className="mt-4">
                  <p className="text-[12.5px] text-[#6B6B6B]">{b.products.brand}</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-[#111111] line-clamp-1">
                    {b.products.name}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.products.applicable_species && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[12px] text-[#6B6B6B]">
                      {b.products.applicable_species === "cats" ? tPet("cat") : b.products.applicable_species === "dogs" ? tPet("dog") : tPet("universal")}
                    </span>
                  )}
                  <span className="text-[12px] text-[#D2D1CF]">
                    {t("bookmarked")} {new Date(b.created_at).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-white p-16 text-center">
          <EmojiIcon name="Heart" className="mx-auto size-12 text-[#D2D1CF]" />
          <p className="mt-4 text-[17px] text-[#6B6B6B]">{t("noBookmarks")}</p>
          <p className="mt-1 text-[14px] text-[#D2D1CF]">{t("browseHint")}</p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-[44px] items-center rounded-full bg-[#FF7A59] px-7 text-[14px] font-semibold text-white hover:bg-[#E86A4A]"
          >
            {t("browseProducts")}
          </Link>
        </section>
      )}
    </div>
  )
}
