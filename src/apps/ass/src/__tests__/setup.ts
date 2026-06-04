import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

vi.mock('@xterm/xterm', () => {
  class TerminalMock {
    cols = 80
    rows = 24
    element: HTMLElement | null = null
    onDataCallbacks = new Set<(data: string) => void>()

    constructor(_options?: unknown) {}
    loadAddon(addon: { activate?: (terminal: TerminalMock) => void }) {
      addon.activate?.(this)
    }
    open(element: HTMLElement) {
      this.element = element
      element.setAttribute('data-xterm-open', 'true')
    }
    write(data: string) {
      if (this.element) this.element.textContent = `${this.element.textContent ?? ''}${data}`
    }
    focus() {}
    dispose() {
      if ((globalThis as { __OPENSE_TEST_XTERM_DISPOSE_FAIL__?: boolean }).__OPENSE_TEST_XTERM_DISPOSE_FAIL__) {
        throw new Error('xterm dispose failed')
      }
      this.onDataCallbacks.clear()
    }
    onData(callback: (data: string) => void) {
      this.onDataCallbacks.add(callback)
      return { dispose: () => this.onDataCallbacks.delete(callback) }
    }
  }

  return { Terminal: TerminalMock }
})

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class FitAddonMock {
    fit() {}
  },
}))

vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: class WebglAddonMock {
    constructor() {
      if ((globalThis as { __OPENSE_TEST_WEBGL_FAIL__?: boolean }).__OPENSE_TEST_WEBGL_FAIL__) {
        throw new Error('WebGL unavailable')
      }
    }
  },
}))

window.__OPENSE_CONFIG__ = {
  VITE_OPENSE_RUNTIME_TARGET: 'desktop',
  VITE_ASS_ROUTER_BASENAME: '/',
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
})

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
})

afterEach(() => {
  cleanup()
})
