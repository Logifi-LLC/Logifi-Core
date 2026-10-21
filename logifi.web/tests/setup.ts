import { beforeAll, vi } from 'vitest'
import { config } from '@vue/test-utils'
import { __setAirportClientDbForTests } from '../shared/airportClientDb'
import { loadAirportClientDbFixture } from '../shared/__tests__/airportTestDb'

// Mock Supabase client globally
vi.mock('~/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: null },
          unsubscribe: vi.fn()
        }))
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        limit: vi.fn().mockReturnThis()
      })),
      rpc: vi.fn()
    }
  }
})

beforeAll(() => {
  __setAirportClientDbForTests(loadAirportClientDbFixture())
})

// Global test utilities
global.console = {
  ...console,
  // Uncomment to suppress console logs during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
}
