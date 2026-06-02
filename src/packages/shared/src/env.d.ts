interface ImportMetaEnv {
	readonly DEV: boolean
}

interface ImportMetaHot {
	dispose(cb: () => void): void
}

interface ImportMeta {
	readonly env: ImportMetaEnv
	readonly hot?: ImportMetaHot
}
