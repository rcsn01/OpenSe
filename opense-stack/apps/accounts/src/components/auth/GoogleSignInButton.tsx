type GoogleSignInButtonProps = {
  label?: string
  loading?: boolean
  enabled?: boolean
  onClick?: () => Promise<void> | void
}

const GoogleIcon = () => (
  <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.813.96 6.493 2.507l2.56-2.56C19.093 1.253 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.027-1.133 7.827-2.96 1.867-1.867 2.44-4.573 2.44-6.653 0-.613-.053-1.187-.147-1.72h-10.12z" />
  </svg>
)

export const GoogleSignInButton = ({
  label = 'Continue with Google',
  loading = false,
  enabled = false,
  onClick,
}: GoogleSignInButtonProps) => {
  const disabled = loading || !enabled || !onClick
  const className =
    'inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ' +
    (enabled
      ? 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-60'
      : 'border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)] opacity-70')

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      title={enabled ? undefined : 'Google sign-in is not configured'}
    >
      <GoogleIcon />
      {label}
    </button>
  )
}
