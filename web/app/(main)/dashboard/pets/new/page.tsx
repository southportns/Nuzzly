import { NewPetForm } from "./new-form"
import { getTranslations } from "next-intl/server"

export const metadata = {
  title: "Add Pet — Nuzzly Town",
}

export default async function NewPetPage() {
const t = await getTranslations("Pet")

return (<div className="space-y-6">
<div>
<h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
{t("addPet")}
</h1>
<p className="mt-2 text-[14px] text-[#6B6B6B]">{t("addPetDesc")}</p>
</div>
<NewPetForm />
</div>)
}
