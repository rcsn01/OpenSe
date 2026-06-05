import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import protocolRouter from '../electron/protocol-router.cjs'

const {
  createProtocolHandler,
  findDesktopAppRoute,
  resolveAppFilePath,
} = protocolRouter

let tempRoot

const writeFile = (relativePath, content = '') => {
  const target = path.join(tempRoot, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
  return target
}

describe('desktop protocol router', () => {
  afterEach(() => {
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true })
      tempRoot = undefined
    }
  })

  it('maps app prefixes to bundled apps', () => {
    expect(findDesktopAppRoute('/')).toEqual({ appName: 'accounts', appPath: '/' })
    expect(findDesktopAppRoute('/accounts/login')).toEqual({
      appName: 'accounts',
      appPath: '/login',
    })
    expect(findDesktopAppRoute('/etl/dashboard')).toEqual({
      appName: 'etl',
      appPath: '/dashboard',
    })
    expect(findDesktopAppRoute('/stoqr/dashboard')).toEqual({
      appName: 'stoqr',
      appPath: '/dashboard',
    })
  })

  it('routes unknown paths back to Accounts instead of an unbundled app', () => {
    expect(findDesktopAppRoute('/opense/dashboard')).toEqual({
      appName: 'accounts',
      appPath: '/',
    })
    expect(findDesktopAppRoute('/ass/sessions/one')).toEqual({
      appName: 'accounts',
      appPath: '/',
    })
  })

  it('falls back to the app index for client routes', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opense-desktop-'))
    const index = writeFile('etl/index.html', 'index')

    expect(resolveAppFilePath({ appsRoot: tempRoot, pathname: '/etl/dashboard' })).toBe(index)
  })

  it('serves nested relative asset requests from the app assets directory', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opense-desktop-'))
    const asset = writeFile('stoqr/assets/index.js', 'asset')
    writeFile('stoqr/index.html', 'index')

    expect(
      resolveAppFilePath({
        appsRoot: tempRoot,
        pathname: '/stoqr/dashboard/assets/index.js',
      }),
    ).toBe(asset)
  })

  it('serves generated config from root and app-prefixed config paths', async () => {
    const handler = createProtocolHandler({
      appsRoot: '/unused',
      getConfigScript: () => 'window.__OPENSE_CONFIG__ = { ok: true };',
    })

    await expect(
      handler(new Request('opense://desktop/config.js')).then((response) => response.text()),
    ).resolves.toContain('ok')
    await expect(
      handler(new Request('opense://desktop/accounts/config.js')).then((response) => response.text()),
    ).resolves.toContain('ok')
    await expect(
      handler(new Request('opense://desktop/stoqr/config.js')).then((response) => response.text()),
    ).resolves.toContain('ok')
  })

  it('redirects bare app roots to trailing-slash URLs for relative assets', async () => {
    const handler = createProtocolHandler({
      appsRoot: '/unused',
      getConfigScript: () => '',
    })

    const response = await handler(new Request('opense://desktop/accounts'))

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('opense://desktop/accounts/')
  })

  it('redirects the legacy setup route into the Accounts setup route', async () => {
    const handler = createProtocolHandler({
      appsRoot: '/unused',
      getConfigScript: () => '',
    })

    const response = await handler(new Request('opense://desktop/setup'))

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('opense://desktop/accounts/setup')
  })
})
