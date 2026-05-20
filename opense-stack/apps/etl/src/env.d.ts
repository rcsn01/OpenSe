/// <reference types="vite/client" />

interface ImportMeta {
  readonly hot?: {
    dispose: (callback: () => void) => void
  }
  readonly glob: (pattern: string, options?: { eager?: boolean; import?: string; as?: string }) => Record<string, unknown>
}
