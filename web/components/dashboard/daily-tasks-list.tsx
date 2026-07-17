"use client"

import { useState } from "react"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Task {
  id: string
  title: string
  icon: string | null
  category: string
  frequency: string
}

interface TaskLog {
  task_id: string
  completed: boolean
  skipped: boolean
}

interface Props {
  tasks: Task[]
  logs: TaskLog[]
  petId: string | null
  date: string
}

const categoryColors: Record<string, string> = {
  feeding: "bg-[#FF7A59]/10 text-[#FF7A59]",
  grooming: "bg-[#585858]/10 text-[#585858]",
  health: "bg-[#34c759]/10 text-[#34c759]",
  exercise: "bg-[#007AFF]/10 text-[#007AFF]",
  training: "bg-[#AF52DE]/10 text-[#AF52DE]",
  other: "bg-[#6B6B6B]/10 text-[#6B6B6B]",
}

export function DailyTasksList({ tasks, logs, petId, date }: Props) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(
    new Set(logs.filter(l => l.completed).map(l => l.task_id))
  )
  const [loading, setLoading] = useState<string | null>(null)

  async function handleComplete(taskId: string) {
    setLoading(taskId)

    try {
      const response = await fetch("/api/daily-tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          pet_id: petId,
          task_date: date,
        }),
      })

      if (!response.ok) throw new Error("完成任务失败")

      setCompletedTasks(prev => new Set([...prev, taskId]))
      toast.success("任务已完成")
    } catch (error) {
      toast.error("操作失败，请重试")
    } finally {
      setLoading(null)
    }
  }

  async function handleSkip(taskId: string) {
    setLoading(taskId)

    try {
      const response = await fetch("/api/daily-tasks/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          pet_id: petId,
          task_date: date,
        }),
      })

      if (!response.ok) throw new Error("跳过任务失败")

      toast.success("已跳过")
    } catch (error) {
      toast.error("操作失败，请重试")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isCompleted = completedTasks.has(task.id)
        const isLoading = loading === task.id
        const colorClass = categoryColors[task.category] || categoryColors.other

        return (
          <div
            key={task.id}
            className={`flex items-center justify-between rounded-[12px] p-3 transition-colors ${
              isCompleted ? "bg-[#34c759]/5" : "bg-[#F7F6F3] hover:bg-[#F0EFED]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{task.icon || "📌"}</span>
              <div>
                <p className={`text-[14px] font-medium ${isCompleted ? "text-[#6B6B6B] line-through" : "text-[#111111]"}`}>
                  {task.title}
                </p>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] ${colorClass}`}>
                  {task.category}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isCompleted && (
                <button
                  onClick={() => handleSkip(task.id)}
                  disabled={isLoading}
                  className="rounded-full px-3 py-1 text-[12px] text-[#6B6B6B] hover:bg-[#E8E8E8]"
                >
                  跳过
                </button>
              )}
              <button
                onClick={() => handleComplete(task.id)}
                disabled={isLoading || isCompleted}
                className="flex items-center gap-1"
              >
                {isLoading ? (
                  <Loader2 className="size-5 animate-spin text-[#FF7A59]" />
                ) : isCompleted ? (
                  <CheckCircle2 className="size-5 text-[#34c759]" />
                ) : (
                  <Circle className="size-5 text-[#D2D1CF] hover:text-[#FF7A59]" />
                )}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
