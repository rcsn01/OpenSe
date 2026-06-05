const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('openPi', {
  startTerminal: (input) => ipcRenderer.invoke('assistant:start-terminal', input),
  writeTerminal: (terminalId, data) => ipcRenderer.invoke('assistant:write-terminal', terminalId, data),
  resizeTerminal: (terminalId, cols, rows) => ipcRenderer.invoke('assistant:resize-terminal', terminalId, cols, rows),
  stopTerminal: (terminalId) => ipcRenderer.invoke('assistant:stop-terminal', terminalId),
  initializePiConfig: (input) => ipcRenderer.invoke('assistant:initialize-pi-config', input),
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
