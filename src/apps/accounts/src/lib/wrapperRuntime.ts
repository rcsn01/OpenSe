import { isDesktopRuntime, isMobileRuntime } from '@repo/shared/runtime-config'

export type WrapperRuntimeTarget = 'desktop' | 'mobile'

type WrapperWindow = Window & {
  openseDesktop?: {
    configure?: (accountsUrl: string) => Promise<unknown>
  }
  openseMobile?: {
    routeDeepLink?: (url: string) => boolean
  }
}

const getWrapperWindow = () => (typeof window === 'undefined' ? null : (window as WrapperWindow))

export const getWrapperRuntimeTarget = (): WrapperRuntimeTarget | null => {
  const wrapperWindow = getWrapperWindow()

  if (isDesktopRuntime() || wrapperWindow?.openseDesktop?.configure) {
    return 'desktop'
  }

  if (isMobileRuntime() || wrapperWindow?.openseMobile?.routeDeepLink) {
    return 'mobile'
  }

  return null
}

export const canUseWrapperSetup = () => getWrapperRuntimeTarget() !== null
