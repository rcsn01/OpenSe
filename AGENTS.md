# Repository Instructions

## Universal App Layout Rules

All current and future apps must follow the shared shell and layout rhythm.

- Use shared layout primitives from `src/packages/ui` whenever possible.
- App page shells should match the shared spacing used by StoQR and ETL unless a product-specific exception is explicitly requested.
- Do not add app-specific wrapper padding, duplicated gutters, or extra top spacing around shared top bars, tab bars, or page shells.
- If an app needs different spacing, add a named option, prop, or token to the shared UI layer instead of hardcoding local padding.
- New apps must start from the shared `AppShellLayout` and `AppPageShell`. Do not create a custom shell unless the shared components cannot support the requirement.
- App-specific page shells may wrap shared behavior, but must not redefine gutters or top-bar spacing locally.
- Before editing any app shell or page shell, compare against:
  - `src/packages/ui/src/components/layout/*`
  - `src/apps/stoqr/src/components/StoqrPageShell.tsx`
  - `src/apps/etl/src/components/ETLPageShell.tsx`
