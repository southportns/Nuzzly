"use client"

import { LobeProvider } from "./lobe-provider"

export function DynamicLobeProvider({ children }: { children: React.ReactNode }) {
  return <LobeProvider>{children}</LobeProvider>
}
