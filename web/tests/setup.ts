// Test setup file
import { vi } from 'vitest'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}))

// Mock AI client
vi.mock('@/lib/ai/client', () => ({
  chatCompletionSync: vi.fn().mockResolvedValue('{"summary": "test", "risk_level": "low"}'),
  isConfigured: vi.fn().mockReturnValue(true),
}))
