export default function AILoading() {
  return (
    <div className="fixed left-1/2 bottom-0 flex w-[90%] max-w-[1700px] -translate-x-1/2 overflow-hidden rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.04)] bg-[#F7F6F3]"
      style={{ top: "calc(95px + var(--safe-top))" }}
    >
      {/* Sidebar skeleton */}
      <div className="hidden md:block w-64 shrink-0 border-r border-[rgba(0,0,0,0.04)] bg-white/40 p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-[#F0EFED] animate-pulse" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6">
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-lg bg-[#F0EFED] animate-pulse" />
          <div className="h-4 w-64 rounded-lg bg-[#F0EFED] animate-pulse" />
          <div className="mt-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/60 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
