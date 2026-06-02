const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('openseDesktop', {
  configure: (accountsUrl) => ipcRenderer.invoke('desktop:configure', accountsUrl),
  getConfiguration: () => ipcRenderer.invoke('desktop:get-configuration'),
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
  resetConfiguration: () => ipcRenderer.invoke('desktop:reset-configuration'),
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

window.addEventListener('error', (event) => {
  showRendererError(
    'OpenSe Desktop renderer error',
    event.error?.stack || event.message || 'Unknown renderer error',
  )
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  showRendererError(
    'OpenSe Desktop promise rejection',
    reason?.stack || reason?.message || String(reason),
  )
})
