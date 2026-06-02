const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { serializeMobileRuntimeLoader } = require('./runtime-config.cjs')

const root = path.resolve(__dirname, '../../..')
const mobileRoot = path.resolve(__dirname, '..')
const wwwRoot = path.join(mobileRoot, 'www')
const assetRoot = path.join(mobileRoot, 'assets')

const apps = [
  { name: 'accounts', dir: path.join(root, 'apps/accounts') },
  { name: 'etl', dir: path.join(root, 'apps/etl') },
  { name: 'stoqr', dir: path.join(root, 'apps/stoqr') },
]

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed.`)
  }
}

const copyDir = (from, to) => {
  fs.rmSync(to, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.cpSync(from, to, { recursive: true })
}

const patchBundledIndex = (appDir) => {
  const indexPath = path.join(appDir, 'index.html')
  let html = fs.readFileSync(indexPath, 'utf8')
  html = html.replace('src="/config.js"', 'src="./config.js"')
  if (!html.includes('mobile-bridge.js')) {
    html = html.replace(
      '<script type="module"',
      '<script src="./mobile-bridge.js"></script>\n    <script type="module"',
    )
  }
  fs.writeFileSync(indexPath, html)
}

const removeWebOnlyPublicFiles = (appDir) => {
  fs.rmSync(path.join(appDir, 'config.example.js'), { force: true })
  fs.rmSync(path.join(appDir, '.well-known'), { recursive: true, force: true })
}

fs.mkdirSync(wwwRoot, { recursive: true })
fs.copyFileSync(path.join(assetRoot, 'index.html'), path.join(wwwRoot, 'index.html'))
fs.copyFileSync(path.join(assetRoot, 'setup.js'), path.join(wwwRoot, 'setup.js'))
fs.writeFileSync(path.join(wwwRoot, 'config.js'), serializeMobileRuntimeLoader())

for (const app of apps) {
  run('pnpm', ['--dir', app.dir, 'build', '--mode', 'mobile'])

  const target = path.join(wwwRoot, app.name)
  copyDir(path.join(app.dir, 'dist'), target)
  fs.writeFileSync(path.join(target, 'config.js'), serializeMobileRuntimeLoader())
  fs.copyFileSync(path.join(assetRoot, 'mobile-bridge.js'), path.join(target, 'mobile-bridge.js'))
  patchBundledIndex(target)
  removeWebOnlyPublicFiles(target)
}

const allowed = new Set(['accounts', 'etl', 'stoqr', 'index.html', 'setup.js', 'config.js'])
const unexpected = fs.readdirSync(wwwRoot).filter((entry) => !allowed.has(entry))
if (unexpected.length > 0) {
  throw new Error(`Unexpected mobile www entries: ${unexpected.join(', ')}`)
}
