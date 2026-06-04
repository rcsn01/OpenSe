const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('openseDesktop', {
  configure: (accountsUrl) => ipcRenderer.invoke('desktop:configure', accountsUrl),
  getConfiguration: () => ipcRenderer.invoke('desktop:get-configuration'),
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
  resetConfiguration: () => ipcRenderer.invoke('desktop:reset-configuration'),
})

contextBridge.exposeInMainWorld('openseAssistant', {
  startTerminal: (input) => ipcRenderer.invoke('assistant:start-terminal', input),
  writeTerminal: (terminalId, data) => ipcRenderer.invoke('assistant:write-terminal', terminalId, data),
  resizeTerminal: (terminalId, cols, rows) => ipcRenderer.invoke('assistant:resize-terminal', terminalId, cols, rows),
  stopTerminal: (terminalId) => ipcRenderer.invoke('assistant:stop-terminal', terminalId),
  getStatus: () => ipcRenderer.invoke('assistant:get-status'),
  listSessions: () => ipcRenderer.invoke('assistant:list-sessions'),
  createSession: (input) => ipcRenderer.invoke('assistant:create-session', input),
  openSession: (sessionId) => ipcRenderer.invoke('assistant:open-session', sessionId),
  loadTranscriptPage: (sessionId, options) => ipcRenderer.invoke('assistant:load-transcript-page', sessionId, options),
  sendCommand: (sessionId, command, behavior, promptIds) =>
    ipcRenderer.invoke('assistant:send-command', sessionId, command, behavior, promptIds),
  runSlashCommand: (sessionId, command, args, promptIds) =>
    ipcRenderer.invoke('assistant:run-slash-command', sessionId, command, args, promptIds),
  runShellCommand: (sessionId, command, agent) =>
    ipcRenderer.invoke('assistant:run-shell-command', sessionId, command, agent),
  abort: (sessionId) => ipcRenderer.invoke('assistant:abort', sessionId),
  closeSession: (sessionId) => ipcRenderer.invoke('assistant:close-session', sessionId),
  deleteSession: (sessionId) => ipcRenderer.invoke('assistant:delete-session', sessionId),
  renameSession: (sessionId, title) => ipcRenderer.invoke('assistant:rename-session', sessionId, title),
  forkSession: (sessionId, messageId) => ipcRenderer.invoke('assistant:fork-session', sessionId, messageId),
  summarizeSession: (sessionId, model) => ipcRenderer.invoke('assistant:summarize-session', sessionId, model),
  revertSession: (sessionId, messageId) => ipcRenderer.invoke('assistant:revert-session', sessionId, messageId),
  unrevertSession: (sessionId) => ipcRenderer.invoke('assistant:unrevert-session', sessionId),
  shareSession: (sessionId) => ipcRenderer.invoke('assistant:share-session', sessionId),
  unshareSession: (sessionId) => ipcRenderer.invoke('assistant:unshare-session', sessionId),
  getSessionData: (sessionId) => ipcRenderer.invoke('assistant:get-session-data', sessionId),
  listCapabilities: (sessionId) => ipcRenderer.invoke('assistant:list-capabilities', sessionId),
  setModel: (sessionId, provider, modelId) => ipcRenderer.invoke('assistant:set-model', sessionId, provider, modelId),
  setThinkingLevel: (sessionId, level) => ipcRenderer.invoke('assistant:set-thinking-level', sessionId, level),
  setSteeringMode: (sessionId, mode) => ipcRenderer.invoke('assistant:set-steering-mode', sessionId, mode),
  setFollowUpMode: (sessionId, mode) => ipcRenderer.invoke('assistant:set-follow-up-mode', sessionId, mode),
  setAutoCompaction: (sessionId, enabled) => ipcRenderer.invoke('assistant:set-auto-compaction', sessionId, enabled),
  setAutoRetry: (sessionId, enabled) => ipcRenderer.invoke('assistant:set-auto-retry', sessionId, enabled),
  getDiff: (sessionId, mode) => ipcRenderer.invoke('assistant:get-diff', sessionId, mode),
  initGit: (sessionId) => ipcRenderer.invoke('assistant:init-git', sessionId),
  respondToPermission: (sessionId, permissionId, response) =>
    ipcRenderer.invoke('assistant:respond-permission', sessionId, permissionId, response),
  respondToQuestion: (sessionId, requestId, answers) =>
    ipcRenderer.invoke('assistant:respond-question', sessionId, requestId, answers),
  rejectQuestion: (sessionId, requestId) => ipcRenderer.invoke('assistant:reject-question', sessionId, requestId),
  respondToExtensionUi: (sessionId, response) =>
    ipcRenderer.invoke('assistant:respond-extension-ui', sessionId, response),
  executeTuiCommand: (sessionId, command) => ipcRenderer.invoke('assistant:execute-tui-command', sessionId, command),
  onSessionEvent: (sessionId, callback) => {
    const channel = `assistant:session-event:${sessionId}`
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on(channel, listener)
    void ipcRenderer.invoke('assistant:subscribe-session', sessionId)
    return () => {
      ipcRenderer.removeListener(channel, listener)
      void ipcRenderer.invoke('assistant:unsubscribe-session', sessionId)
    }
  },
  onTerminalEvent: (terminalId, callback) => {
    const channel = `assistant:terminal-event:${terminalId}`
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on(channel, listener)
    void ipcRenderer.invoke('assistant:subscribe-terminal', terminalId)
    return () => {
      ipcRenderer.removeListener(channel, listener)
      void ipcRenderer.invoke('assistant:unsubscribe-terminal', terminalId)
    }
  },
})

const showRendererError = (title, detail) => {
  const render = () => {
    const existing = document.querySelector('[data-opense-desktop-error]')
    if (existing) existing.remove()

    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-opense-desktop-error', 'true')
    wrapper.style.cssText = [
      'position: fixed',
      'inset: 0',
      'z-index: 2147483647',
      'box-sizing: border-box',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'padding: 32px',
      'background: #f7f8fb',
      'color: #142033',
      'font: 14px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    ].join(';')

    const panel = document.createElement('div')
    panel.style.cssText = [
      'max-width: 720px',
      'width: 100%',
      'border: 1px solid #d9dee8',
      'border-radius: 8px',
      'background: #fff',
      'padding: 24px',
      'box-shadow: 0 18px 50px rgba(20, 32, 51, 0.12)',
    ].join(';')

    const heading = document.createElement('h1')
    heading.textContent = title
    heading.style.cssText = 'margin: 0 0 12px; font-size: 20px; line-height: 1.25'

    const body = document.createElement('pre')
    body.textContent = detail
    body.style.cssText = [
      'margin: 0',
      'white-space: pre-wrap',
      'overflow-wrap: anywhere',
      'color: #5d6a7d',
      'font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    ].join(';')

    panel.append(heading, body)
    wrapper.append(panel)
    document.body.append(wrapper)
  }

  if (document.body) {
    render()
  } else {
    window.addEventListener('DOMContentLoaded', render, { once: true })
  }
}

const isResizeObserverLoopError = (message) => (
  typeof message === 'string' &&
  (
    message.includes('ResizeObserver loop completed with undelivered notifications') ||
    message.includes('ResizeObserver loop limit exceeded')
  )
)

window.addEventListener('error', (event) => {
  if (isResizeObserverLoopError(event.message)) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }

  showRendererError(
    'OpenSe Desktop renderer error',
    event.error?.stack || event.message || 'Unknown renderer error',
  )
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  if (isResizeObserverLoopError(reason?.message || String(reason))) {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }

  showRendererError(
    'OpenSe Desktop promise rejection',
    reason?.stack || reason?.message || String(reason),
  )
})
