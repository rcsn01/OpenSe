const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const APP_PREFIXES = {
  '/accounts': 'accounts',
  '/ass': 'ass',
  '/etl': 'etl',
  '/stoqr': 'stoqr',
}

const MIME_TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const getMimeType = (filePath) =>
  MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'

const stripPrefix = (pathname, prefix) => {
  const stripped = pathname.slice(prefix.length)
  return stripped === '' ? '/' : stripped
}

const findDesktopAppRoute = (pathname) => {
  if (pathname === '/' || pathname === '') {
    return { appName: 'accounts', appPath: '/' }
  }

  for (const [prefix, appName] of Object.entries(APP_PREFIXES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return { appName, appPath: stripPrefix(pathname, prefix) }
    }
  }

  return { appName: 'accounts', appPath: '/' }
}

const resolveAppFilePath = ({ appsRoot, pathname }) => {
  const route = findDesktopAppRoute(pathname)
  const appRoot = path.join(appsRoot, route.appName)
  const requestedPath = decodeURIComponent(route.appPath.split('?')[0])
  const safeRelativePath = requestedPath.replace(/^\/+/, '')
  const requestedFile = path.normalize(path.join(appRoot, safeRelativePath))

  if (!requestedFile.startsWith(appRoot)) {
    return path.join(appRoot, 'index.html')
  }

  if (fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
    return requestedFile
  }

  const assetIndex = safeRelativePath.indexOf('assets/')
  if (assetIndex > 0) {
    const assetFile = path.join(appRoot, safeRelativePath.slice(assetIndex))
    if (fs.existsSync(assetFile) && fs.statSync(assetFile).isFile()) {
      return assetFile
    }
  }

  return path.join(appRoot, 'index.html')
}

const fileResponse = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(fs.readFileSync(filePath), {
    headers: {
      'Content-Type': getMimeType(filePath),
    },
  })
}

const createProtocolHandler = ({ appsRoot, getConfigScript }) => {
  return async (request) => {
    const url = new URL(request.url)

    if (url.hostname !== 'desktop') {
      return new Response('Not found', { status: 404 })
    }

    if (Object.keys(APP_PREFIXES).some((prefix) => url.pathname === prefix)) {
      return Response.redirect(`opense://desktop${url.pathname}/${url.search}${url.hash}`, 302)
    }

    if (url.pathname === '/config.js' || Object.keys(APP_PREFIXES).some((prefix) => url.pathname === `${prefix}/config.js`)) {
      return new Response(getConfigScript(), {
        headers: { 'Content-Type': 'text/javascript' },
      })
    }

    if (url.pathname === '/setup' || url.pathname === '/setup/' || url.pathname.startsWith('/setup/')) {
      return Response.redirect(`opense://desktop/accounts/setup${url.search}${url.hash}`, 302)
    }

    return fileResponse(resolveAppFilePath({ appsRoot, pathname: url.pathname }))
  }
}

const toFileUrl = (filePath) => pathToFileURL(filePath).toString()

module.exports = {
  APP_PREFIXES,
  createProtocolHandler,
  findDesktopAppRoute,
  resolveAppFilePath,
  toFileUrl,
}
