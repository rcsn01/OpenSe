import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom's localStorage can break when Supabase auth timers fire between tests.
// Provide a robust in-memory Storage implementation.
const store = new Map<string, string>()
const storage: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, String(value)) },
  removeItem: (key: string) => { store.delete(key) },
  clear: () => { store.clear() },
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() { return store.size },
}
Object.defineProperty(window, 'localStorage', { value: storage, writable: true, configurable: true })
window.__OPENSE_CONFIG__ = {
  VITE_SUPABASE_URL: 'https://supabase.example.com',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
}

afterEach(() => {
  store.clear()
  cleanup()
})
