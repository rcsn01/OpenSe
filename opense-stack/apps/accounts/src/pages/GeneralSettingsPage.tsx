import { Card, CardContent, CardDescription, CardHeader, CardTitle, Toggle, useTheme } from '@repo/ui'

export const GeneralSettingsPage = () => {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">General</h1>
        <p className="text-sm text-slate-600">Manage general preferences for your account workspace.</p>
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
