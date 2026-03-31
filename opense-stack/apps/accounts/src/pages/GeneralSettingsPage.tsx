import { Card, CardContent, CardDescription, CardHeader, CardTitle, Toggle, useTheme } from '@repo/ui'

export const GeneralSettingsPage = () => {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-heading)]">General</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Manage general preferences for your account workspace.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Switch between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <Toggle
            id="general-dark-mode-toggle"
            label="Dark mode"
            checked={isDark}
            onChange={(event) => {
              setTheme(event.target.checked ? 'dark' : 'light')
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
