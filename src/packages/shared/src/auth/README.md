# Shared Auth

This folder contains reusable auth building blocks for all apps in the monorepo.

## Exports

- `@repo/shared/auth`: auth API (`signIn`, `signUp`, `signOut`, `signInWithGoogle`, profile/password helpers, `hasUsers`)
- `@repo/shared/auth/context`: `AuthProvider` and `useAuth`
- `@repo/shared/auth/validation`: `validatePassword`

## AuthProvider

```ts
<AuthProvider>
  <App />
</AuthProvider>
```

`useAuth` provides the current Supabase `session`, `user`, auth `loading` state, and `logout`.

## Current app usage

- `apps/etl`: uses `<AuthProvider>`
- `apps/stoqr`: uses `<AuthProvider>`

## Migration notes

- `useSession` in `@repo/shared/hooks` is deprecated.
- Prefer `useAuth` from `@repo/shared/auth/context` for all new apps.
