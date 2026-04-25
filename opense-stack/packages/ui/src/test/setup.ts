import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom's localStorage can be incomplete under the workspace test runner.
// Provide a stable in-memory Storage implementation for UI tests.
const store = new Map<string, string>()
const storage: Storage = {
	getItem: (key: string) => store.get(key) ?? null,
	setItem: (key: string, value: string) => {
		store.set(key, String(value))
	},
	removeItem: (key: string) => {
		store.delete(key)
	},
	clear: () => {
		store.clear()
	},
	key: (index: number) => [...store.keys()][index] ?? null,
	get length() {
		return store.size
	},
}

Object.defineProperty(window, 'localStorage', {
	value: storage,
	writable: true,
	configurable: true,
})

afterEach(() => {
	store.clear()
	cleanup()
})
