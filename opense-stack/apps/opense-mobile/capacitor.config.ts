import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.opense.mobile',
  appName: 'OpenSe',
  webDir: 'www',
  plugins: {
    App: {
      urlScheme: 'opense',
    },
  },
}

export default config
