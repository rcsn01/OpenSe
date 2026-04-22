# Route Coverage Matrix (Playwright)

This tracker maps each app router path to route-level Playwright coverage.

Status legend:
- `covered-existing`: already covered by previous specs
- `covered-new`: covered by specs added in this implementation pass
- `needs-deep`: route is covered, but deeper component interactions still desirable

## Accounts (`apps/accounts/src/App.tsx`)

| Route | Status | Spec |
|---|---|---|
| `/` | covered-new | `apps/accounts/route-coverage.spec.ts` |
| `/login`, `/signin` | covered-new | `apps/accounts/route-coverage.spec.ts` |
| `/register`, `/signup` | covered-new | `apps/accounts/route-coverage.spec.ts` |
| `/onboarding`, `/onboarding/invitations`, `/onboarding/create-organisation`, `/onboarding/invite-members` | covered-new | `apps/accounts/route-coverage.spec.ts` |
| `/settings`, `/organisation`, `/billing`, `/seats` | covered-new | `apps/accounts/route-coverage.spec.ts` |
| `/account*` aliases | covered-new | `apps/accounts/route-coverage.spec.ts` |
| `*` | covered-new | `apps/accounts/route-coverage.spec.ts` |
| Billing + seats mutation flows | needs-deep | `apps/accounts/billing-seats.spec.ts` (`E2E_ACCOUNTS_DEEP=true`) |

## Admin (`apps/admin/src/App.tsx`)

| Route | Status | Spec |
|---|---|---|
| `/god-mode` | covered-existing | `apps/admin/god-mode.spec.ts` |
| `/login` | covered-existing | `apps/admin/auth.spec.ts` |
| `/platform` | covered-existing | `apps/admin/platform.spec.ts` |
| `/organisations` | covered-existing | `apps/admin/etl-admin.spec.ts`, `apps/admin/lifecycle.spec.ts` |
| `/stoqr` | covered-existing | `apps/admin/stoqr-admin.spec.ts` |
| `/etl-admin`, `/super-admin` aliases | covered-new | `apps/admin/route-coverage.spec.ts` |
| `/` and `*` redirect semantics | covered-new | `apps/admin/route-coverage.spec.ts` |

## ETL (`apps/etl/src/App.tsx`)

| Route | Status | Spec |
|---|---|---|
| `/` | covered-existing | `apps/etl/landing.spec.ts` |
| `/login`, `/register` | covered-existing | `apps/etl/auth.spec.ts` |
| `/dashboard`, `/dashboard/personal`, `/dashboard/org` | covered-new | `apps/etl/route-coverage.spec.ts` |
| `/organisation`, `/organisation/team`, `/organisation/usage`, `/organisation/logs` | covered-new | `apps/etl/route-coverage.spec.ts` |
| `/gallery` | covered-existing | `apps/etl/gallery.spec.ts` |
| `/activity` | covered-new | `apps/etl/route-coverage.spec.ts` |
| `/settings/profile` | covered-new | `apps/etl/route-coverage.spec.ts` |
| `/editor/:id` | covered-existing | `apps/etl/workflow-editor.spec.ts` |
| `*` | covered-new | `apps/etl/route-coverage.spec.ts` |

## StoQR (`apps/stoqr/src/App.tsx`)

| Route | Status | Spec |
|---|---|---|
| `/`, `/auth`, `/signup` | covered-existing | `apps/stoqr/landing.spec.ts`, `apps/stoqr/auth.spec.ts` |
| `/dashboard` | covered-existing | `apps/stoqr/dashboard.spec.ts` |
| `/inventory`, `/inventory/new`, `/inventory/:id` | covered-existing | `apps/stoqr/inventory.spec.ts`, `apps/stoqr/products.spec.ts` |
| `/scan` | covered-existing | `apps/stoqr/scan.spec.ts` |
| `/tools/labels` | covered-new | `apps/stoqr/route-coverage.spec.ts` |
| `/settings/team` | covered-existing | `apps/stoqr/settings.spec.ts` |
| `/reports` | covered-existing | `apps/stoqr/reports.spec.ts` |
| `/procurement` | covered-existing | `apps/stoqr/procurement.spec.ts` |
| `/alerts` | covered-existing | `apps/stoqr/alerts.spec.ts` |
| `*` | covered-new | `apps/stoqr/route-coverage.spec.ts` |

## OpenSe (`apps/opense/src/App.tsx`)

| Route | Status | Spec |
|---|---|---|
| `/`, `/etl`, `/stoqr` | covered-new | `apps/opense/landing.spec.ts`, `apps/opense/redirects.spec.ts` |
| `/login`, `/register`, `/auth`, `/signup` | covered-new | `apps/opense/redirects.spec.ts` |
| `*` | covered-new | `apps/opense/redirects.spec.ts` |

## UI Design (`apps/ui-design/src/App.tsx`)

| Route | Status | Spec |
|---|---|---|
| `/`, `/colors`, `/typography`, `/spacing`, `/buttons`, `/forms`, `/cards`, `/badges`, `/alerts`, `/data`, `/navigation`, `/overlays`, `/dividers`, `/test` | covered-new | `apps/ui-design/route-coverage.spec.ts` |
| `*` | covered-new | `apps/ui-design/route-coverage.spec.ts` |
