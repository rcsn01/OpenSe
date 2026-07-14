import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDirectory, '..')
const repositoryRoot = resolve(sourceRoot, '..')
const envPath = join(repositoryRoot, '.env')
const templatePath = join(sourceRoot, 'docker', 'runtime-config.template.js')

if (existsSync(envPath)) {
  loadEnvFile(envPath)
}

const defaultValues = {
  VITE_GOOGLE_AUTH_ENABLED: 'false',
  VITE_AUTH_COOKIE_DOMAIN: '',
  VITE_ACCOUNTS_URL: 'http://localhost:5991',
  VITE_ETL_PUBLIC_URL: 'http://localhost:5992',
  VITE_OPEN_KB_PUBLIC_URL: 'http://localhost:5995',
  VITE_OPENSE_PUBLIC_URL: 'http://localhost:5994',
  VITE_STOQR_PUBLIC_URL: 'http://localhost:5993',
  VITE_UI_PUBLIC_URL: 'http://localhost:5999',
}

const template = readFileSync(templatePath, 'utf8')
const runtimeKeys = [
  ...new Set([...template.matchAll(/\$\{([A-Z][A-Z0-9_]*)\}/g)].map((match) => match[1])),
]

for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
  if (!process.env[key]) {
    throw new Error(`${key} is required. Set it in ${envPath}.`)
  }
}

const runtimeConfig = Object.fromEntries(
  runtimeKeys.map((key) => [key, process.env[key] ?? defaultValues[key] ?? '']),
)
const configSource = `window.__OPENSE_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)};\n`

const apps = ['accounts', 'etl', 'kb', 'opense', 'stoqr', 'ui-design']
const appArgumentIndex = process.argv.indexOf('--app')
const selectedApps = appArgumentIndex === -1 ? apps : [process.argv[appArgumentIndex + 1]]

for (const app of selectedApps) {
  if (!apps.includes(app)) {
    throw new Error(`Unknown app: ${app ?? '(missing)'}`)
  }

  const configPath = join(sourceRoot, 'apps', app, 'public', 'config.js')
  const temporaryPath = `${configPath}.${process.pid}.tmp`
  writeFileSync(temporaryPath, configSource)
  renameSync(temporaryPath, configPath)
  console.log(`Generated ${configPath}`)
}
