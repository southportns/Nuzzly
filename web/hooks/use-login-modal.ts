import { useEffect, useState } from "react"

type Listener = (open: boolean) => void
const listeners = new Set<Listener>()

export function openLoginModal() {
  for (const l of listeners) l(true)
}

export function closeLoginModal() {
  for (const l of listeners) l(false)
}

export function useLoginModal() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const l: Listener = (v) => setOpen(v)
    listeners.add(l)
    return () => { listeners.delete(l); }
  }, [])
  // also expose local setter so components (like Header) can control the modal
  const setModalOpen = (v: boolean) => {
    // update local state and notify other listeners
    setOpen(v)
    for (const l of listeners) l(v)
  }
  return [open, setModalOpen] as const
}
