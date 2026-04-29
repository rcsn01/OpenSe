#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const stackRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(stackRoot, '..')
const envPath = resolve(stackRoot, '.env')

const args = new Set(process.argv.slice(2))
const shouldReset = !args.has('--no-reset')
const shouldRunDev = args.has('--dev')

const appUrls = {
  VITE_ADMIN_PUBLIC_URL: 'http://localhost:5990',
  VITE_ACCOUNTS_URL: 'http://localhost:5991',
  VITE_ETL_PUBLIC_URL: 'http://localhost:5992',
  VITE_STOQR_PUBLIC_URL: 'http://localhost:5993',
  VITE_OPENSE_PUBLIC_URL: 'http://localhost:5994',
  VITE_UI_PUBLIC_URL: 'http://localhost:5999',
}

function run(command, commandArgs, options = {}) {
  console.log(`> ${command} ${commandArgs.join(' ')}`)
  execFileSync(command, commandArgs, {
    cwd: options.cwd ?? repoRoot,
    stdio: options.stdio ?? 'inherit',
    shell: process.platform === 'win32',
  })
}

function capture(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })
}

function checkDocker() {
  const result = spawnSync('docker', ['info'], {
    cwd: repoRoot,
    shell: process.platform === 'win32',
    stdio: 'ignore',
  })

  if (result.status !== 0) {
    throw new Error('Docker is not running. Start Docker Desktop or Docker Engine, then rerun this script.')
  }
}

function parseEnv(output) {
  const env = {}

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=["']?(.+?)["']?$/)
    if (match) env[match[1]] = match[2]
  }

  return env
}

function parseStatusText(output) {
  const env = {}
  const urlMatch = output.match(/API URL:\s*(\S+)/i)
  const anonMatch = output.match(/anon key:\s*(\S+)/i)
  const serviceMatch = output.match(/service_role key:\s*(\S+)/i)

  if (urlMatch) env.API_URL = urlMatch[1]
  if (anonMatch) env.ANON_KEY = anonMatch[1]
  if (serviceMatch) env.SERVICE_ROLE_KEY = serviceMatch[1]

  return env
}

function readSupabaseEnv() {
  try {
    return parseEnv(capture('supabase', ['status', '-o', 'env']))
  } catch {
    return parseStatusText(capture('supabase', ['status']))
  }
}

function upsertEnv(existing, updates) {
  const lines = existing ? existing.split(/\r?\n/) : []
  const seen = new Set()
  const output = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/)
    if (!match || !(match[1] in updates)) return line
    seen.add(match[1])
    return `${match[1]}=${updates[match[1]]}`
  })

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) output.push(`${key}=${value}`)
  }

  return `${output.filter((line, index, arr) => line.trim() || arr[index + 1]?.trim()).join('\n')}\n`
}

function writeLocalEnv(supabaseEnv) {
  const updates = {
    VITE_SUPABASE_URL: supabaseEnv.API_URL ?? supabaseEnv.SUPABASE_URL ?? 'http://127.0.0.1:54321',
    VITE_SUPABASE_ANON_KEY: supabaseEnv.ANON_KEY ?? supabaseEnv.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: supabaseEnv.SERVICE_ROLE_KEY ?? supabaseEnv.SUPABASE_SERVICE_ROLE_KEY,
    ...appUrls,
  }

  if (!updates.VITE_SUPABASE_ANON_KEY || !updates.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Could not read local Supabase anon/service keys from `supabase status`.')
  }

  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : readFileSync(resolve(stackRoot, '.env.example'), 'utf8')
  writeFileSync(envPath, upsertEnv(existing, updates))
  console.log(`Updated ${envPath}`)
}

function main() {
  console.log('Preparing OpenSe local development environment...')
  checkDocker()

  run('corepack', ['enable'], { cwd: stackRoot })
  run('pnpm', ['install'], { cwd: stackRoot })
  run('supabase', ['start'], { cwd: repoRoot })

  if (shouldReset) {
    run('supabase', ['db', 'reset'], { cwd: repoRoot })
  }

  writeLocalEnv(readSupabaseEnv())

  console.log('\nLocal Supabase is ready.')
  console.log('Run `pnpm dev` for every app, or `pnpm dev:stoqr` / `pnpm dev:accounts` for focused work.')

  if (shouldRunDev) {
    run('pnpm', ['dev'], { cwd: stackRoot })
  }
}

try {
  main()
} catch (error) {
  console.error(`\nsetup:local failed: ${error.message}`)
  process.exit(1)
}
