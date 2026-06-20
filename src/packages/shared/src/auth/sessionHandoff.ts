import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'

const ACCESS_TOKEN_PARAM = 'opense_access_token'
const REFRESH_TOKEN_PARAM = 'opense_refresh_token'

const getHandoffParams = (value: string) => {
  const normalized = value.replace(/^[?#]/, '')
  return new URLSearchParams(normalized)
}

const hasHandoffParams = (params: URLSearchParams) =>
  Boolean(params.get(ACCESS_TOKEN_PARAM) && params.get(REFRESH_TOKEN_PARAM))

const removeHandoffParams = () => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  const hashParams = getHandoffParams(url.hash)
  const searchParams = url.searchParams

  hashParams.delete(ACCESS_TOKEN_PARAM)
  hashParams.delete(REFRESH_TOKEN_PARAM)
  searchParams.delete(ACCESS_TOKEN_PARAM)
  searchParams.delete(REFRESH_TOKEN_PARAM)

  url.hash = hashParams.toString()
  url.search = searchParams.toString()
  window.history.replaceState(window.history.state, '', url.toString())
}

export const consumeAuthHandoffFromUrl = async (): Promise<Session | null> => {
  if (typeof window === 'undefined') return null

  const url = new URL(window.location.href)
  const hashParams = getHandoffParams(url.hash)
  const searchParams = url.searchParams
  const params = hasHandoffParams(hashParams) ? hashParams : searchParams
  const accessToken = params.get(ACCESS_TOKEN_PARAM)
  const refreshToken = params.get(REFRESH_TOKEN_PARAM)

  if (!accessToken || !refreshToken) {
    return null
  }

  removeHandoffParams()

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) throw error
  return data.session
}

export const buildAuthHandoffUrlFromSession = (
  targetUrl: string,
  session: Pick<Session, 'access_token' | 'refresh_token'> | null | undefined,
): string => {
  if (!session?.access_token || !session.refresh_token) {
    return targetUrl
  }

  const url = new URL(targetUrl, window.location.origin)
  const params = getHandoffParams(url.hash)
  params.set(ACCESS_TOKEN_PARAM, session.access_token)
  params.set(REFRESH_TOKEN_PARAM, session.refresh_token)
  url.hash = params.toString()
  return url.toString()
}

export const buildAuthHandoffUrl = async (
  targetUrl: string,
  sessionOverride?: Pick<Session, 'access_token' | 'refresh_token'> | null,
): Promise<string> => {
  if (sessionOverride !== undefined) {
    return buildAuthHandoffUrlFromSession(targetUrl, sessionOverride)
  }

  const { data } = await supabase.auth.getSession()
  return buildAuthHandoffUrlFromSession(targetUrl, data.session)
}

export const navigateWithAuthHandoff = async (
  targetUrl: string,
  sessionOverride?: Pick<Session, 'access_token' | 'refresh_token'> | null,
) => {
  window.location.assign(await buildAuthHandoffUrl(targetUrl, sessionOverride))
}
