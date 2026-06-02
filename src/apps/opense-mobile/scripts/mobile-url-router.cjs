const SUPPORTED_MOBILE_APPS = new Set(['accounts', 'etl', 'stoqr'])

const mobileDeepLinkToPath = (value) => {
  const parsed = new URL(value)
  if (parsed.protocol !== 'opense:' || parsed.hostname !== 'mobile') {
    throw new Error('URL is not an OpenSe mobile deep link.')
  }

  const parts = parsed.pathname.split('/').filter(Boolean)
  const appName = parts.shift()
  if (!SUPPORTED_MOBILE_APPS.has(appName)) {
    throw new Error('Unsupported OpenSe mobile app target.')
  }

  const appPath = `/${parts.join('/')}`
  const routePath = appPath === '/' ? '/' : appPath
  return `/${appName}/index.html#${routePath}${parsed.search}${parsed.hash}`
}

module.exports = {
  SUPPORTED_MOBILE_APPS,
  mobileDeepLinkToPath,
}
