"use client"

import { EmojiIcon } from "@/components/ui/emoji-icon"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { deletePet } from "@/lib/supabase/actions/pet-form-actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export function PetDeleteButton({ petId, petName }: { petId: string; petName: string }) {
const t = useTranslations("Pet")
const tCommon = useTranslations("Common")
const router = useRouter()
const [deleting, setDeleting] = useState(false)

async function handleDelete() {
if (!confirm(t("deleteConfirmText", { name: petName }))) return

setDeleting(true)
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
setDeleting(false)
toast.error(t("notSignIn"))
return
}
const { error } = await deletePet(petId, user.id)
setDeleting(false)

if (error) {
toast.error(error.message)
return
}

toast.success(t("petProfileDeletedToast"))
router.refresh()
}

return (<Button
variant="ghost"
size="icon"
className="size-8 text-[#D2D1CF] hover:text-[#E85D4A] hover:bg-[#E85D4A]/10"
onClick={(e) => {
e.preventDefault()
e.stopPropagation()
handleDelete()
}}
disabled={deleting}
>
{deleting? (<EmojiIcon name="Loader2" className="size-4 animate-spin" />): (<EmojiIcon name="Trash2" className="size-4" />)}
</Button>)
}
