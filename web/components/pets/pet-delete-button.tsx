"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { deletePet } from "@/lib/supabase/actions/pet-form-actions"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function PetDeleteButton({ petId, petName }: { petId: string; petName: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`确定要删除「${petName}」的档案吗？此操作不可撤销。`)) return

    setDeleting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setDeleting(false)
      toast.error("未登录")
      return
    }
    const { error } = await deletePet(petId, user.id)
    setDeleting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("宠物档案已删除")
    router.refresh()
  }

  return (
    <Button
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
      {deleting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
    </Button>
  )
}
