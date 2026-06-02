const { spawn } = require('node:child_process')
const path = require('node:path')
const process = require('node:process')

const packageRoot = path.resolve(__dirname, '..')

const apps = [
  { name: 'accounts', port: 5991, args: ['--dir', '../accounts', 'dev'] },
  { name: 'etl', port: 5992, args: ['--dir', '../etl', 'dev'] },
  { name: 'stoqr', port: 5993, args: ['--dir', '../stoqr', 'dev'] },
]

const children = []

const spawnProcess = (name, command, args, options = {}) => {
  const child = spawn(command, args, {
    cwd: packageRoot,
    env: {
      ...process.env,
      ...options.env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`)
  })
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`)
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    console.error(`[${name}] exited with ${signal ?? code}`)
    shutdown(code || 1)
  })

  children.push(child)
  return child
}

const isPortReady = async (port) => {
  const url = `http://127.0.0.1:${port}`

  try {
    const response = await fetch(url)
    return response.ok || response.status < 500
  } catch {
    return false
  }
}

const waitForPort = async (port, timeoutMs = 30000) => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortReady(port)) return

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for http://127.0.0.1:${port}`)
}

let shuttingDown = false

const shutdown = (exitCode = 0) => {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  setTimeout(() => process.exit(exitCode), 250)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

const main = async () => {
  for (const app of apps) {
    if (await isPortReady(app.port)) {
      console.log(`[${app.name}] reusing existing dev server on http://localhost:${app.port}`)
      continue
    }

    spawnProcess(app.name, 'pnpm', app.args)
  }

  await Promise.all(apps.map((app) => waitForPort(app.port)))

  spawnProcess('electron', 'pnpm', ['exec', 'electron', '.'], {
    env: {
      OPENSE_DESKTOP_DEV_SERVERS: '1',
    },
  })
}

main().catch((error) => {
  console.error(error)
  shutdown(1)
})
