import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

type TerminalMockOptions = {
  theme?: { background?: string; foreground?: string; [key: string]: string | undefined }
  [key: string]: unknown
}

vi.mock('@xterm/xterm', () => {
  class TerminalMock {
    cols = 80
    rows = 24
    element: HTMLElement | null = null
    onDataCallbacks = new Set<(data: string) => void>()
    private _options: TerminalMockOptions = {}

    constructor(options?: TerminalMockOptions) {
      if (options) this._options = { ...options }
      const instances =
        (globalThis as { __OPENSE_TEST_XTERM_INSTANCES?: TerminalMock[] }).__OPENSE_TEST_XTERM_INSTANCES ?? []
      instances.push(this)
      ;(globalThis as { __OPENSE_TEST_XTERM_INSTANCES?: TerminalMock[] }).__OPENSE_TEST_XTERM_INSTANCES = instances
    }

    get options() {
      return this._options
    }

    set options(value: TerminalMockOptions) {
      this._options = {
        ...this._options,
        ...value,
        ...(value.theme ? { theme: { ...this._options.theme, ...value.theme } } : {}),
      }
    }
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
