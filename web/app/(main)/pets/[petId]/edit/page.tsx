import { redirect } from "next/navigation"

export default async function EditPetLegacyPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  redirect(`/dashboard/pets/${petId}/edit`)
}
