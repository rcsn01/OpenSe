/// <reference types="vite/client" />

interface ImportMetaHot {
  dispose(callback: () => void): void
}

interface ImportMeta {
  readonly hot?: ImportMetaHot
}
