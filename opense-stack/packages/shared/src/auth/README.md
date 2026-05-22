# Shared Auth

This folder contains reusable auth building blocks for all apps in the monorepo.

## Exports

- `@repo/shared/auth`: auth API (`signIn`, `signUp`, `signOut`, `signInWithGoogle`, profile/password helpers, `hasUsers`)
- `@repo/shared/auth/context`: `AuthProvider` and `useAuth`
- `@repo/shared/auth/validation`: `validatePassword`
- `@repo/shared/auth/demo`: demo user constants and `createDemoUser`

## AuthProvider options

```ts
<AuthProvider demoMode>
  <App />
</AuthProvider>
```

- `demoMode`: enables `isDemoUser`, `loginAsDemo`, `logoutDemo`

## Current app usage

- `apps/etl`: uses `<AuthProvider demoMode>`
- `apps/stoqr`: uses `<AuthProvider>`

## Migration notes

- `useSession` in `@repo/shared/hooks` is deprecated.
- Prefer `useAuth` from `@repo/shared/auth/context` for all new apps.
