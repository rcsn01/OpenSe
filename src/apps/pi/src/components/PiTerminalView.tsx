import { useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useTheme } from '@repo/ui'
import type {
  AssistantTerminalSession,
  OpenPiBridge,
} from '../lib/assistantBridge'
import { getTerminalTheme } from '../lib/terminalTheme'

type PiTerminalViewProps = {
  bridge: OpenPiBridge
  directoryPath?: string
  visible: boolean
}

export const PiTerminalView = ({ bridge, directoryPath, visible }: PiTerminalViewProps) => {
  const { resolvedTheme } = useTheme()
  const initialThemeRef = useRef(resolvedTheme)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const webglAddonRef = useRef<WebglAddon | null>(null)
  const terminalSessionIdRef = useRef<string | null>(null)
  const [session, setSession] = useState<AssistantTerminalSession | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 13,
      lineHeight: 1.15,
      scrollback: 5000,
      theme: getTerminalTheme(initialThemeRef.current),
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    const container = containerRef.current
    if (container) {
      terminal.open(container)
      try {
        const webglAddon = new WebglAddon()
        terminal.loadAddon(webglAddon)
        webglAddonRef.current = webglAddon
      } catch {
        webglAddonRef.current = null
      }
    }

    return () => {
      try {
        webglAddonRef.current?.dispose()
      } catch {
        // xterm's WebGL cleanup can throw in Electron dev remounts; default rendering is fine.
      }
      try {
        terminal.dispose()
      } catch {
        // Keep React error boundaries out of renderer-addon disposal failures.
      }
      terminalRef.current = null
      fitAddonRef.current = null
      webglAddonRef.current = null
      terminalSessionIdRef.current = null
    }
  }, [])

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return
    terminal.options.theme = { ...getTerminalTheme(resolvedTheme) }
  }, [resolvedTheme])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setStarting(true)
    setError(null)

    const start = async () => {
      try {
        const nextSession = await bridge.startTerminal(directoryPath ? { directoryPath } : undefined)
        if (cancelled) return
        if (!nextSession) {
          setSession(null)
          setError('Terminal was not started.')
          return
        }
        terminalSessionIdRef.current = nextSession.id
        setSession(nextSession)
        if (nextSession.initialData) terminalRef.current?.write(nextSession.initialData)
      } catch (startError) {
        if (!cancelled) setError(startError instanceof Error ? startError.message : String(startError))
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    void start()
    return () => {
      cancelled = true
    }
  }, [bridge, directoryPath, visible])

  useEffect(() => {
    if (!session) return
    return bridge.onTerminalEvent(session.id, (event) => {
      if (event.type === 'data') {
        terminalRef.current?.write(event.data)
        return
      }
      if (event.type === 'status' && event.status !== 'running') {
        setError(`Terminal ${event.status}${event.exitCode == null ? '' : ` (${event.exitCode})`}.`)
      }
    })
  }, [bridge, session])

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return undefined
    const disposable = terminal.onData((data) => {
      const terminalId = terminalSessionIdRef.current
      if (terminalId) void bridge.writeTerminal(terminalId, data)
    })
    return () => disposable.dispose()
  }, [bridge])

  useEffect(() => {
    if (!visible) return undefined
    const container = containerRef.current
    const terminal = terminalRef.current
    const fitAddon = fitAddonRef.current
    if (!container || !terminal || !fitAddon) return undefined

    const fit = () => {
      try {
        fitAddon.fit()
        const terminalId = terminalSessionIdRef.current
        if (terminalId) void bridge.resizeTerminal(terminalId, terminal.cols, terminal.rows)
      } catch {
        // Fit can fail during transient zero-size layout; the next resize will retry.
      }
    }

    const frame = window.requestAnimationFrame(() => {
      fit()
      terminal.focus()
    })
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    window.addEventListener('resize', fit)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [bridge, visible, session?.id])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-background)]" data-testid="pi-terminal-view">
      {error ? (
        <div className="border-b border-[var(--color-destructive)] bg-[color:color-mix(in_srgb,var(--color-destructive)_8%,transparent)] px-3 py-2 text-xs text-[var(--color-destructive)]">
          {error}
        </div>
      ) : null}
      {starting ? (
        <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
          Starting Pi terminal...
        </div>
      ) : null}
      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden p-2" />
    </div>
  )
}
