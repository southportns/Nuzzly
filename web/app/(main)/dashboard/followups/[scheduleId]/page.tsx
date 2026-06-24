import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { FollowupWizard } from "@/components/reviews/followup-wizard"

export default async function FollowupPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Query schedule with joined product + pet info
  const { data: schedule, error } = await supabase
    .from("review_followup_schedules")
    .select("*, product_reviews!inner(id, product_id, products!inner(name), pets!inner(name))")
    .eq("id", scheduleId)
    .eq("profile_id", user.id)
    .single()

  if (error || !schedule) notFound()

  // Cast to access nested data (types from generated DB types)
  const reviewData = schedule.product_reviews as unknown as {
    id: string
    product_id: string
    products: { name: string }
    pets: { name: string }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">长期追踪反馈</h1>
      <FollowupWizard
        scheduleId={schedule.id}
        productName={reviewData.products.name}
        petName={reviewData.pets.name}
        followupDay={schedule.followup_day}
      />
    </div>
  )
}
