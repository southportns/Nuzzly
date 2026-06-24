"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { deleteHealthRecord } from "@/lib/supabase/actions/pet-form-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Stethoscope, Pill, Syringe, Weight, Calendar, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { HealthRecord, HealthRecordType } from "@/lib/supabase/types"

interface HealthRecordsProps {
  petId: string
}

const recordTypeConfig: Record<HealthRecordType, { icon: typeof Stethoscope; label: string; color: string }> = {
  weight: { icon: Weight, label: "体重", color: "bg-purple-100 text-purple-700" },
  symptom: { icon: Stethoscope, label: "症状", color: "bg-red-100 text-red-700" },
  diagnosis: { icon: Stethoscope, label: "诊断", color: "bg-orange-100 text-orange-700" },
  medication: { icon: Pill, label: "用药", color: "bg-blue-100 text-blue-700" },
  vaccination: { icon: Syringe, label: "疫苗", color: "bg-green-100 text-green-700" },
  checkup: { icon: Stethoscope, label: "体检", color: "bg-gray-100 text-gray-700" },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function HealthRecords({ petId }: HealthRecordsProps) {
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<HealthRecordType | "all">("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function loadRecords() {
      setLoading(true)
      const { data } = await supabase
        .from("health_records")
        .select("*")
        .eq("pet_id", petId)
        .order("record_time", { ascending: false })
      setRecords(data || [])
      setLoading(false)
    }
    loadRecords()
  }, [petId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const filteredRecords = activeTab === "all" ? records : records.filter((r) => r.record_type === activeTab)

  async function handleDelete(id: string) {
    if (!user) { toast.error("请先登录"); return }
    if (!confirm("确定要删除这条健康记录吗？")) return

    setDeletingId(id)
    const { error } = await deleteHealthRecord(id, user.id)
    setDeletingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    setRecords((prev) => prev.filter((r) => r.id !== id))
    toast.success("健康记录已删除")
    router.refresh()
  }

  // Count by type
  const typeCounts = records.reduce((acc, record) => {
    acc[record.record_type] = (acc[record.record_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            健康记录
          </span>
          <Badge variant="outline">{records.length} 条记录</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HealthRecordType | "all")}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="text-xs">
              全部 ({records.length})
            </TabsTrigger>
            {Object.entries(recordTypeConfig).map(([type, config]) => {
              const count = typeCounts[type] || 0
              if (count === 0) return null
              return (
                <TabsTrigger key={type} value={type} className="text-xs">
                  {config.label} ({count})
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无健康记录</p>
                <p className="text-sm mt-1">记录宠物的诊断、用药、疫苗等信息</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((record) => {
                  const config = recordTypeConfig[record.record_type as HealthRecordType] || recordTypeConfig.checkup
                  const Icon = config.icon

                  return (
                    <div key={record.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(record.record_time)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 text-[#D2D1CF] hover:text-[#E85D4A] hover:bg-[#E85D4A]/10"
                            onClick={() => handleDelete(record.id)}
                            disabled={deletingId === record.id}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        {/* Weight Record */}
                        {record.record_type === "weight" && record.weight_kg && (
                          <p className="text-lg font-medium mt-1">{record.weight_kg} kg</p>
                        )}

                        {/* Symptom Record */}
                        {record.record_type === "symptom" && (
                          <div className="mt-1">
                            {record.symptom_code && (
                              <span className="font-medium">{record.symptom_code}</span>
                            )}
                            {record.severity && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                严重程度: {record.severity}/5
                              </Badge>
                            )}
                            {record.duration_days && (
                              <span className="text-xs text-muted-foreground ml-2">
                                持续 {record.duration_days} 天
                              </span>
                            )}
                          </div>
                        )}

                        {/* Diagnosis Record */}
                        {record.record_type === "diagnosis" && record.diagnosis && (
                          <div className="mt-1">
                            <span className="font-medium">{record.diagnosis}</span>
                            {record.vet_clinic && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {record.vet_clinic}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Medication Record */}
                        {record.record_type === "medication" && record.medication_name && (
                          <div className="mt-1">
                            <span className="font-medium">{record.medication_name}</span>
                            {record.medication_dosage && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {record.medication_dosage}
                              </span>
                            )}
                            {record.medication_frequency && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {record.medication_frequency}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {record.notes && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
