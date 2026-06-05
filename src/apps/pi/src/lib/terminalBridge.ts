export type TerminalStatus = 'running' | 'closed' | 'exited' | 'error'

export type TerminalAppStatus = {
  available: boolean
  shell?: string
  error?: string
}

export type TerminalDirectory = {
  id: string
  path: string
  name: string
  createdAt: string
  updatedAt: string
  lastOpenedAt: string
}

export type TerminalSession = {
  id: string
  directoryPath: string
  status: TerminalStatus
  initialData?: string
}

export type TerminalEvent =
  | { type: 'data'; id: string; data: string }
  | { type: 'status'; id: string; status: TerminalStatus; exitCode?: number; signal?: string; error?: string }

export type OpenPiBridge = {
  getStatus: () => Promise<TerminalAppStatus>
  listDirectories: () => Promise<TerminalDirectory[]>
  chooseDirectory: () => Promise<TerminalDirectory | null>
  removeDirectory: (directoryId: string) => Promise<void>
  startTerminal: (input?: { directoryPath?: string; cols?: number; rows?: number }) => Promise<TerminalSession | null>
  writeTerminal: (terminalId: string, data: string) => Promise<void>
  resizeTerminal: (terminalId: string, cols: number, rows: number) => Promise<void>
  stopTerminal: (terminalId: string) => Promise<void>
  onTerminalEvent: (terminalId: string, callback: (event: TerminalEvent) => void) => () => void
}

declare global {
  interface Window {
    openPi?: OpenPiBridge
  }
}

export const getTerminalBridge = () => window.openPi
