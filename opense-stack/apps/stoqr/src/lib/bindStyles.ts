import { cn } from '@repo/ui/cn'

type StyleToken = string | false | null | undefined

export const bindStyles = (styles: Record<string, string>) => (...tokens: StyleToken[]) =>
  cn(
    tokens
      .filter((token): token is string => typeof token === 'string' && token.length > 0)
      .map((token) => styles[token])
      .filter(Boolean),
  )
