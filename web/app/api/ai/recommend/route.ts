// Minimal POST /api/ai/recommend — returns placeholder recommendations
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    // Minimal placeholder recommendations based on optional pet context
    const recommendations = [
      { id: 'rec-1', title: '示例猫粮 A', reason: '适合肠胃敏感' },
      { id: 'rec-2', title: '示例猫粮 B', reason: '高蛋白，适合活跃猫' },
    ]

    return Response.json({ recommendations, received: body })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
