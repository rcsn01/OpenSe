const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('openPi', {
  getStatus: () => ipcRenderer.invoke('terminal:get-status'),
  listDirectories: () => ipcRenderer.invoke('terminal:list-directories'),
  chooseDirectory: () => ipcRenderer.invoke('terminal:choose-directory'),
  removeDirectory: (directoryId) => ipcRenderer.invoke('terminal:remove-directory', directoryId),
  startTerminal: (input) => ipcRenderer.invoke('terminal:start', input),
  writeTerminal: (terminalId, data) => ipcRenderer.invoke('terminal:write', terminalId, data),
  resizeTerminal: (terminalId, cols, rows) => ipcRenderer.invoke('terminal:resize', terminalId, cols, rows),
  stopTerminal: (terminalId) => ipcRenderer.invoke('terminal:stop', terminalId),
  onTerminalEvent: (terminalId, callback) => {
    const channel = `terminal:event:${terminalId}`
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on(channel, listener)
    void ipcRenderer.invoke('terminal:subscribe', terminalId)
    return () => {
      ipcRenderer.removeListener(channel, listener)
      void ipcRenderer.invoke('terminal:unsubscribe', terminalId)
    }
  },
})
