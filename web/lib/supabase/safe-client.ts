// =============================================
// Phase 1.2.2: Safe Supabase Client
// Exposes ONLY read methods. Any mutation attempt throws runtime error.
// Use this in application code instead of raw supabase client.
// =============================================

import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

type SafeSupabaseClient = Omit<SupabaseClient<Database>, "from"> & {
  from: <T extends keyof Database["public"]["Tables"]>(table: T) => SafeFromBuilder<T>
}

interface SafeFromBuilder<T extends keyof Database["public"]["Tables"]> {
  select: (columns?: string) => SelectBuilder<T>
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown | null }>
  // Block mutations
  insert: () => never
  update: () => never
  delete: () => never
  upsert: () => never
}

interface SelectBuilder<T extends keyof Database["public"]["Tables"]> {
  eq: (column: string, value: unknown) => SelectBuilder<T>
  neq: (column: string, value: unknown) => SelectBuilder<T>
  gt: (column: string, value: unknown) => SelectBuilder<T>
  gte: (column: string, value: unknown) => SelectBuilder<T>
  lt: (column: string, value: unknown) => SelectBuilder<T>
  lte: (column: string, value: unknown) => SelectBuilder<T>
  in: (column: string, values: unknown[]) => SelectBuilder<T>
  contains: (column: string, value: unknown) => SelectBuilder<T>
  containedBy: (column: string, value: unknown) => SelectBuilder<T>
  rangeGt: (column: string, value: unknown) => SelectBuilder<T>
  rangeGte: (column: string, value: unknown) => SelectBuilder<T>
  rangeLt: (column: string, value: unknown) => SelectBuilder<T>
  rangeLte: (column: string, value: unknown) => SelectBuilder<T>
  rangeAdjacent: (column: string, value: unknown) => SelectBuilder<T>
  overlaps: (column: string, value: unknown) => SelectBuilder<T>
  textSearch: (column: string, query: string, options?: { config?: string; type?: "plain" | "phrase" | "websearch" }) => SelectBuilder<T>
  match: (query: Record<string, unknown>) => SelectBuilder<T>
  not: (column: string, operator: string, value: unknown) => SelectBuilder<T>
  or: (filters: string, options?: { foreignTable?: string }) => SelectBuilder<T>
  filter: (column: string, operator: string, value: unknown) => SelectBuilder<T>
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) => SelectBuilder<T>
  limit: (count: number, options?: { foreignTable?: string }) => SelectBuilder<T>
  range: (start: number, end: number, options?: { foreignTable?: string }) => SelectBuilder<T>
  single: () => Promise<{ data: Database["public"]["Tables"][T]["Row"] | null; error: unknown | null }>
  maybeSingle: () => Promise<{ data: Database["public"]["Tables"][T]["Row"] | null; error: unknown | null }>
  then: (fn: (result: { data: Database["public"]["Tables"][T]["Row"][] | null; error: unknown | null }) => unknown) => Promise<unknown>
}

const MUTATION_BLOCKED_ERROR = "[SafeClient] Direct database mutations are blocked. Use writeGateway.submit() instead. See: /lib/gateway/write-gateway.ts"

function throwMutationBlocked(): never {
  throw new Error(MUTATION_BLOCKED_ERROR)
}

function createSafeFromBuilder<T extends keyof Database["public"]["Tables"]>(
  originalFrom: SupabaseClient<Database>["from"]
): SafeFromBuilder<T> {
  const original = originalFrom("" as T) as unknown as Record<string, unknown>

  return {
    select: (columns?: string) => {
      const selectQuery = original.select(columns) as unknown as Record<string, unknown>
      const builder: SelectBuilder<T> = {
        eq: (column: string, value: unknown) => {
          selectQuery.eq?.(column, value)
          return builder
        },
        neq: (column: string, value: unknown) => {
          selectQuery.neq?.(column, value)
          return builder
        },
        gt: (column: string, value: unknown) => {
          selectQuery.gt?.(column, value)
          return builder
        },
        gte: (column: string, value: unknown) => {
          selectQuery.gte?.(column, value)
          return builder
        },
        lt: (column: string, value: unknown) => {
          selectQuery.lt?.(column, value)
          return builder
        },
        lte: (column: string, value: unknown) => {
          selectQuery.lte?.(column, value)
          return builder
        },
        in: (column: string, values: unknown[]) => {
          selectQuery.in?.(column, values)
          return builder
        },
        contains: (column: string, value: unknown) => {
          selectQuery.contains?.(column, value)
          return builder
        },
        containedBy: (column: string, value: unknown) => {
          selectQuery.containedBy?.(column, value)
          return builder
        },
        rangeGt: (column: string, value: unknown) => {
          selectQuery.rangeGt?.(column, value)
          return builder
        },
        rangeGte: (column: string, value: unknown) => {
          selectQuery.rangeGte?.(column, value)
          return builder
        },
        rangeLt: (column: string, value: unknown) => {
          selectQuery.rangeLt?.(column, value)
          return builder
        },
        rangeLte: (column: string, value: unknown) => {
          selectQuery.rangeLte?.(column, value)
          return builder
        },
        rangeAdjacent: (column: string, value: unknown) => {
          selectQuery.rangeAdjacent?.(column, value)
          return builder
        },
        overlaps: (column: string, value: unknown) => {
          selectQuery.overlaps?.(column, value)
          return builder
        },
        textSearch: (column: string, query: string, options?: { config?: string; type?: "plain" | "phrase" | "websearch" }) => {
          selectQuery.textSearch?.(column, query, options)
          return builder
        },
        match: (query: Record<string, unknown>) => {
          selectQuery.match?.(query)
          return builder
        },
        not: (column: string, operator: string, value: unknown) => {
          selectQuery.not?.(column, operator, value)
          return builder
        },
        or: (filters: string, options?: { foreignTable?: string }) => {
          selectQuery.or?.(filters, options)
          return builder
        },
        filter: (column: string, operator: string, value: unknown) => {
          selectQuery.filter?.(column, operator, value)
          return builder
        },
        order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) => {
          selectQuery.order?.(column, options)
          return builder
        },
        limit: (count: number, options?: { foreignTable?: string }) => {
          selectQuery.limit?.(count, options)
          return builder
        },
        range: (start: number, end: number, options?: { foreignTable?: string }) => {
          selectQuery.range?.(start, end, options)
          return builder
        },
        single: () => selectQuery.single?.() as Promise<{ data: Database["public"]["Tables"][T]["Row"] | null; error: unknown | null }>,
        maybeSingle: () => selectQuery.maybeSingle?.() as Promise<{ data: Database["public"]["Tables"][T]["Row"] | null; error: unknown | null }>,
        then: (fn: (result: { data: Database["public"]["Tables"][T]["Row"][] | null; error: unknown | null }) => unknown) => {
          return (selectQuery as unknown as Promise<unknown>).then(fn)
        },
      }
      return builder
    },
    rpc: async (fn: string, params?: Record<string, unknown>) => {
      return original.rpc(fn, params) as Promise<{ data: unknown; error: unknown | null }>
    },
    insert: throwMutationBlocked,
    update: throwMutationBlocked,
    delete: throwMutationBlocked,
    upsert: throwMutationBlocked,
  }
}

export async function createSafeClient(): Promise<SafeSupabaseClient> {
  const client = await createServerClient()

  return {
    ...client,
    from: <T extends keyof Database["public"]["Tables"]>(table: T) =>
      createSafeFromBuilder<T>(client.from.bind(client)),
  } as SafeSupabaseClient
}

export function createSafeBrowserClient(): SafeSupabaseClient {
  const client = createBrowserClient()

  return {
    ...client,
    from: <T extends keyof Database["public"]["Tables"]>(table: T) =>
      createSafeFromBuilder<T>(client.from.bind(client)),
  } as SafeSupabaseClient
}
