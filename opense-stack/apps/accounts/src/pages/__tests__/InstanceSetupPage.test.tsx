/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InstanceSetupPage } from '../InstanceSetupPage'
import { MOBILE_STORAGE_KEY } from '../../lib/instanceSetup'

const discovery = {
  version: 1,
  instanceName: 'OpenSe Test',
  supabaseUrl: 'https://example.supabase.co',
  supabasePublishableKey: 'sb_key',
  googleAuthEnabled: true,
}

const fillAccountsUrl = (value: string) => {
  fireEvent.change(screen.getByLabelText('Accounts URL'), {
    target: { value },
  })
}

let restoreLocation: (() => void) | null = null

const installLocalStorage = () => {
  const values = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
      clear: vi.fn(() => values.clear()),
    },
  })
}

describe('InstanceSetupPage', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  afterEach(() => {
    cleanup()
    restoreLocation?.()
    restoreLocation = null
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('renders the desktop setup form', () => {
    render(<InstanceSetupPage target="desktop" />)

    expect(screen.getByRole('heading', { name: 'Connect to Instance' })).toBeTruthy()
    expect(screen.getByLabelText('Accounts URL')).toBeTruthy()
  })

  it('reports invalid Accounts URLs before submitting', async () => {
    render(<InstanceSetupPage target="desktop" />)

    fillAccountsUrl('ftp://accounts.example.com')
    fireEvent.submit(screen.getByRole('button', { name: 'Connect' }).closest('form')!)

    await screen.findByText('Accounts URL must be an http or https URL.')
  })

  it('shows a loading state while desktop configuration is saving', async () => {
    let resolveConfigure: (value?: unknown) => void = () => {}
    const configure = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveConfigure = resolve
        }),
    )
    Object.defineProperty(window, 'openseDesktop', {
      configurable: true,
      value: { configure },
    })

    render(<InstanceSetupPage target="desktop" />)

    fillAccountsUrl('https://accounts.example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Connect' })).toHaveProperty('disabled', true)
    })
    expect(screen.getByText('Saving desktop configuration...')).toBeTruthy()

    resolveConfigure()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Connect' })).toHaveProperty('disabled', false)
    })
  })

  it('stores mobile discovery and hard-navigates to Accounts login', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(discovery), { status: 200 }))
    const assign = vi.fn()
    const originalLocation = window.location
    restoreLocation = () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      })
    }
    vi.stubGlobal('fetch', fetchMock)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign },
    })

    render(<InstanceSetupPage target="mobile" />)

    fillAccountsUrl('https://accounts.example.com/')
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith('/accounts/index.html#/login')
    })
    expect(fetchMock).toHaveBeenCalledWith('https://accounts.example.com/.well-known/opense-desktop.json')
    expect(JSON.parse(window.localStorage.getItem(MOBILE_STORAGE_KEY) || '{}')).toEqual({
      accountsUrl: 'https://accounts.example.com',
      discovery,
    })
  })

  it('reports mobile discovery fetch failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })))

    render(<InstanceSetupPage target="mobile" />)

    fillAccountsUrl('https://accounts.example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await screen.findByText('Discovery request failed with HTTP 404.')
  })
})
