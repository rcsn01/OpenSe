import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.opense.mobile',
  appName: 'OpenSe',
  webDir: 'www',
  plugins: {
    App: {
      urlScheme: 'opense',
    },
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#ffffff',
      style: 'LIGHT',
    },
  },
}

export default config
