/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SharedLoginPage } from '../SharedLoginPage'
import { SharedSignupPage } from '../SharedSignupPage'

describe('Google Auth button', () => {
  afterEach(() => {
    cleanup()
  })

  it('enables the login Google button when Google Auth is configured', () => {
    const handleGoogleSignIn = vi.fn()

    render(
      <SharedLoginPage
        appName="Accounts"
        onEmailSignIn={vi.fn()}
        onGoogleSignIn={handleGoogleSignIn}
        googleAuthEnabled
        googleLabel="Continue with Google"
      />,
    )

    const button = screen.getByRole('button', { name: /continue with google/i }) as HTMLButtonElement
    expect(button.disabled).toBe(false)

    fireEvent.click(button)

    expect(handleGoogleSignIn).toHaveBeenCalledTimes(1)
  })

  it('disables the login Google button when Google Auth is not configured', () => {
    const handleGoogleSignIn = vi.fn()

    render(
      <SharedLoginPage
        appName="Accounts"
        onEmailSignIn={vi.fn()}
        onGoogleSignIn={handleGoogleSignIn}
        googleAuthEnabled={false}
        googleLabel="Continue with Google"
      />,
    )

    const button = screen.getByRole('button', { name: /continue with google/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    fireEvent.click(button)

    expect(handleGoogleSignIn).not.toHaveBeenCalled()
  })

  it('enables the register Google button when Google Auth is configured', () => {
    const handleGoogleSignIn = vi.fn()

    render(
      <SharedSignupPage
        appName="Accounts"
        onSignUp={vi.fn()}
        onGoogleSignIn={handleGoogleSignIn}
        googleAuthEnabled
      />,
    )

    const button = screen.getByRole('button', { name: /continue with google/i }) as HTMLButtonElement
    expect(button.disabled).toBe(false)

    fireEvent.click(button)

    expect(handleGoogleSignIn).toHaveBeenCalledTimes(1)
  })

  it('disables the register Google button when the runtime flag is missing or false', () => {
    const handleGoogleSignIn = vi.fn()

    render(
      <SharedSignupPage
        appName="Accounts"
        onSignUp={vi.fn()}
        onGoogleSignIn={handleGoogleSignIn}
      />,
    )

    const button = screen.getByRole('button', { name: /continue with google/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    fireEvent.click(button)

    expect(handleGoogleSignIn).not.toHaveBeenCalled()
  })
})
