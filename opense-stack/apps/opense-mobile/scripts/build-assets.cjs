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

const installMobileRuntimeFiles = (appDir) => {
  fs.writeFileSync(path.join(appDir, 'config.js'), serializeMobileRuntimeLoader())
  fs.copyFileSync(path.join(assetRoot, 'mobile-bridge.js'), path.join(appDir, 'mobile-bridge.js'))
  patchBundledIndex(appDir)
  removeWebOnlyPublicFiles(appDir)
}

fs.rmSync(wwwRoot, { recursive: true, force: true })
fs.mkdirSync(wwwRoot, { recursive: true })

for (const app of apps) {
  run('pnpm', ['--dir', app.dir, 'build', '--mode', 'mobile'])

  if (app.name === 'accounts') {
    copyDir(path.join(app.dir, 'dist'), wwwRoot)
    installMobileRuntimeFiles(wwwRoot)
  }

  const target = path.join(wwwRoot, app.name)
  copyDir(path.join(app.dir, 'dist'), target)
  installMobileRuntimeFiles(target)
}

const allowed = new Set(['accounts', 'etl', 'stoqr', 'assets', 'index.html', 'mobile-bridge.js', 'config.js'])
const unexpected = fs.readdirSync(wwwRoot).filter((entry) => !allowed.has(entry))
if (unexpected.length > 0) {
  throw new Error(`Unexpected mobile www entries: ${unexpected.join(', ')}`)
}
