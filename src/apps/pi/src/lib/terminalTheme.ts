import type { ITheme } from '@xterm/xterm'

/** Matches @repo/ui --color-background / --color-foreground in light mode */
const LIGHT_BASE: ITheme = {
  background: '#ffffff',
  foreground: '#0f172a',
  cursor: '#0f172a',
  cursorAccent: '#ffffff',
  selectionBackground: '#bfdbfe',
  selectionForeground: '#0f172a',
}

/** Matches @repo/ui --color-background / --color-foreground in dark mode */
const DARK_BASE: ITheme = {
  background: '#0d0d0d',
  foreground: '#f8fafc',
  cursor: '#f8fafc',
  cursorAccent: '#0d0d0d',
  selectionBackground: '#2b445f',
  selectionForeground: '#f8fafc',
}

/** One Light–style ANSI palette for light backgrounds */
const LIGHT_ANSI: ITheme = {
  black: '#383a42',
  red: '#e45649',
  green: '#50a14f',
  yellow: '#c18401',
  blue: '#4078f2',
  magenta: '#a626a4',
  cyan: '#0184bc',
  white: '#a0a1a7',
  brightBlack: '#4f5259',
  brightRed: '#e06c75',
  brightGreen: '#98c379',
  brightYellow: '#e5c07b',
  brightBlue: '#61afef',
  brightMagenta: '#c678dd',
  brightCyan: '#56b6c2',
  brightWhite: '#ffffff',
}

/** Dark-terminal ANSI palette tuned for #0d0d0d background */
const DARK_ANSI: ITheme = {
  black: '#1a1a1a',
  red: '#f07178',
  green: '#98c379',
  yellow: '#e5c07b',
  blue: '#61afef',
  magenta: '#c678dd',
  cyan: '#56b6c2',
  white: '#abb2bf',
  brightBlack: '#5c6370',
  brightRed: '#ff6b6b',
  brightGreen: '#b5e48c',
  brightYellow: '#ffd166',
  brightBlue: '#7eb6ff',
  brightMagenta: '#d8a6ff',
  brightCyan: '#7ee8fa',
  brightWhite: '#ffffff',
}

const TERMINAL_THEMES: Record<'light' | 'dark', ITheme> = {
  light: { ...LIGHT_BASE, ...LIGHT_ANSI },
  dark: { ...DARK_BASE, ...DARK_ANSI },
}

export const getTerminalTheme = (resolvedTheme: 'light' | 'dark'): ITheme => ({
  ...TERMINAL_THEMES[resolvedTheme],
})
