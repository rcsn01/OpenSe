import { execFileSync } from 'node:child_process'
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

const useLocalSupabase = process.argv.includes('--local-supabase')

const getLocalSupabaseConfig = () => {
  const supabaseCliPath = join(sourceRoot, 'node_modules', '.bin', 'supabase')

  try {
    const output = execFileSync(
      supabaseCliPath,
      ['--workdir', repositoryRoot, 'status', '--output', 'json'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    const status = JSON.parse(output)

    if (!status.API_URL || !status.ANON_KEY) {
      throw new Error('Supabase status did not include API_URL and ANON_KEY.')
    }

    return {
      VITE_SUPABASE_URL: status.API_URL,
      VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
    }
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : ''
    throw new Error(
      `Local Supabase is not available. Start it with \`pnpm db:start\` and try again.${detail}`,
    )
  }
}

const localSupabaseConfig = useLocalSupabase ? getLocalSupabaseConfig() : {}

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
  if (!(localSupabaseConfig[key] ?? process.env[key])) {
    throw new Error(`${key} is required. Set it in ${envPath}.`)
  }
}

const runtimeConfig = Object.fromEntries(
  runtimeKeys.map((key) => [
    key,
    localSupabaseConfig[key] ?? process.env[key] ?? defaultValues[key] ?? '',
  ]),
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
