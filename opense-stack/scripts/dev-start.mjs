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
const shouldSkipInstall = args.has('--skip-install')

if (args.has('--help') || args.has('-h')) {
  console.log(`
OpenSe local Supabase setup

Usage:
  pnpm setup:local              Install deps, start Supabase, reset/seed DB, write .env
  pnpm dev:local                Start Supabase, keep existing DB data, write .env, run all apps
  pnpm setup:local -- --no-reset     Start Supabase and write .env without resetting data
  pnpm setup:local -- --skip-install Skip dependency install when node_modules is already ready

Before running:
  1. Open Docker Desktop and wait until it says Docker is running.
  2. Run this command from the opense-stack folder.
`)
  process.exit(0)
}

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

function runSupabase(commandArgs, options = {}) {
  run('pnpm', ['exec', 'supabase', ...commandArgs], options)
}

function captureSupabase(commandArgs, options = {}) {
  return capture('pnpm', ['exec', 'supabase', ...commandArgs], options)
}

function capture(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })
}

function checkCommand(command, commandArgs, message) {
  const result = spawnSync(command, commandArgs, {
    cwd: stackRoot,
    shell: process.platform === 'win32',
    stdio: 'ignore',
  })

  if (result.status !== 0) throw new Error(message)
}

function checkDocker() {
  const result = spawnSync('docker', ['info'], {
    cwd: repoRoot,
    shell: process.platform === 'win32',
    stdio: 'ignore',
  })

  if (result.status !== 0) {
    throw new Error(
      'Docker is not running. Open Docker Desktop, wait until it has fully started, then run `pnpm setup:local` again.',
    )
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
    return parseEnv(captureSupabase(['status', '-o', 'env'], { cwd: repoRoot }))
  } catch {
    return parseStatusText(captureSupabase(['status'], { cwd: repoRoot }))
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
    throw new Error(
      'Could not read local Supabase anon/service keys. Run `pnpm db:status` and check that Supabase started correctly.',
    )
  }

  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : readFileSync(resolve(stackRoot, '.env.example'), 'utf8')
  writeFileSync(envPath, upsertEnv(existing, updates))
  console.log(`Updated ${envPath}`)
}

function main() {
  console.log('Preparing OpenSe local development environment...')
  console.log('This will start a local Supabase database, seed demo data, and write opense-stack/.env.')

  checkCommand('node', ['--version'], 'Node.js is required. Install the current LTS version from https://nodejs.org/.')
  checkCommand('corepack', ['--version'], 'Corepack is required with Node.js. Reinstall/update Node LTS if this is missing.')
  checkDocker()

  run('corepack', ['enable'], { cwd: stackRoot })
  checkCommand('pnpm', ['--version'], 'pnpm is not available yet. Run `corepack enable`, then rerun `pnpm setup:local`.')

  if (!shouldSkipInstall) {
    run('pnpm', ['install'], { cwd: stackRoot })
  }

  runSupabase(['start'], { cwd: repoRoot })

  if (shouldReset) {
    console.log('Resetting and seeding the local database. Use `pnpm setup:local -- --no-reset` to keep existing local data.')
    runSupabase(['db', 'reset'], { cwd: repoRoot })
  }

  writeLocalEnv(readSupabaseEnv())

  console.log('\nLocal Supabase is ready.')
  console.log('- Supabase API: http://127.0.0.1:54321')
  console.log('- Supabase Studio: http://127.0.0.1:54323')
  console.log('- Accounts app: http://localhost:5991')
  console.log('- StoQR app: http://localhost:5993')
  console.log('Run `pnpm dev` for every app, or `pnpm dev:stoqr` / `pnpm dev:accounts` for focused work.')

  if (shouldRunDev) {
    run('pnpm', ['dev'], { cwd: stackRoot })
  }
}

try {
  main()
} catch (error) {
  console.error(`\nsetup:local failed: ${error.message}`)
  console.error('\nBeginner checklist:')
  console.error('1. Make sure Docker Desktop is open and running.')
  console.error('2. Make sure you are in the opense-stack folder.')
  console.error('3. Run `pnpm setup:local -- --help` to see the setup options.')
  process.exit(1)
}
