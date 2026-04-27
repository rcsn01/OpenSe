import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  BasePage,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  TabBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import {
  createCoupon,
  listCoupons,
  listPricingPlans,
  listRevenueReportSummary,
  setCouponActive,
  updatePricingPlan,
} from '../api/adminPlatform'
import { getErrorMessage } from '../lib/errors'
import { formatFinancialAppCode } from '../lib/appCodes'
import type { FinancialTabId } from '../types/admin-tabs'

type PricingPlan = {
  id: string
  name: string
  app: 'ETL' | 'StoQR' | 'Bundle'
  monthly_price_per_seat: number
  stripe_price_id: string
}

type Coupon = {
  id: string
  code: string
  discount_percent: number
  active: boolean
}

const tabs: Array<{ id: FinancialTabId; label: string }> = [
  { id: 'pricing', label: 'Pricing Plans' },
  { id: 'coupons', label: 'Coupons & Discounts' },
  { id: 'reports', label: 'Revenue Reports' },
]

export const FinancialsPage = () => {
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const activeTab: FinancialTabId = tab === 'coupons' || tab === 'reports' ? tab : 'pricing'
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [newCouponCode, setNewCouponCode] = useState('')
  const [newCouponDiscount, setNewCouponDiscount] = useState('')
  const [savingPricing, setSavingPricing] = useState(false)
  const [reportRows, setReportRows] = useState<Array<{ label: string; value: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    const load = async () => {
      const [pricingRows, couponRows, revenueRows] = await Promise.all([
        listPricingPlans().catch(() => []),
        listCoupons().catch(() => []),
        listRevenueReportSummary().catch(() => []),
      ])

      if (pricingRows.length > 0) {
        setPlans(
          pricingRows.map((row) => ({
            id: row.id,
            name: row.plan_name,
            app: formatFinancialAppCode(row.app_code, row.is_bundle),
            monthly_price_per_seat: Math.floor(row.seat_price_cents / 100),
            stripe_price_id: row.stripe_price_id ?? '—',
          })),
        )
      }

      if (couponRows.length > 0) {
        setCoupons(
          couponRows.map((row) => ({
            id: row.id,
            code: row.code,
            discount_percent: Number(row.discount_percent),
            active: row.is_active,
          })),
        )
      }

      if (revenueRows.length > 0) {
        const mrr = revenueRows.reduce((sum, row) => sum + row.estimated_mrr_cents, 0)
        const etl = revenueRows.find((row) => row.app_code === 'etl')
        const stoqr = revenueRows.find((row) => row.app_code === 'stoqr')
        const stoqrShare = mrr > 0 && stoqr ? Math.round((stoqr.estimated_mrr_cents / mrr) * 100) : 0

        setReportRows([
          { label: 'MRR', value: `$${(mrr / 100).toLocaleString()}` },
          { label: 'Expansion Revenue', value: '—' },
          { label: 'Churn Rate', value: '—' },
          { label: 'StoQR Revenue Share', value: `${stoqrShare}%` },
          { label: 'ETL Seat Total', value: String(etl?.seat_limit_total ?? 0) },
          { label: 'StoQR Seat Total', value: String(stoqr?.seat_limit_total ?? 0) },
        ])
      }
    }

    void load()
  }, [])

  const totalPricingCatalogValue = useMemo(
    () => plans.reduce((sum, plan) => sum + plan.monthly_price_per_seat, 0),
    [plans],
  )

  const toggleCoupon = async (couponId: string) => {
    setError(null)
    const current = coupons.find((coupon) => coupon.id === couponId)
    if (!current) return

    try {
      await setCouponActive(couponId, !current.active)
      setCoupons((rows) => rows.map((coupon) => (coupon.id === couponId ? { ...coupon, active: !coupon.active } : coupon)))
      setMessage('Coupon updated')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to update coupon'))
    }
  }

  const onCreateCoupon = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const code = newCouponCode.trim().toUpperCase()
    const discount = Number(newCouponDiscount)
    if (!code || Number.isNaN(discount) || discount <= 0 || discount > 100) return

    setError(null)
    try {
      const created = await createCoupon(code, discount)
      setCoupons((current) => [
        {
          id: created.id,
          code: created.code,
          discount_percent: Number(created.discount_percent),
          active: created.is_active,
        },
        ...current,
      ])
      setNewCouponCode('')
      setNewCouponDiscount('')
      setMessage('Coupon created')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to create coupon'))
    }
  }

  const savePricingUpdates = async () => {
    setSavingPricing(true)
    setError(null)
    try {
      await Promise.all(plans.map((plan) => updatePricingPlan(plan.id, Math.max(0, Math.round(plan.monthly_price_per_seat * 100)))))
      setMessage('Pricing updated')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to update pricing'))
    } finally {
      setSavingPricing(false)
    }
  }

  return (
    <BasePage>
      {error ? (
          <Card className="border-[var(--color-destructive)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-destructive)]">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {message ? (
          <Card className="border-[var(--color-primary)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-primary)]">{message}</p>
            </CardContent>
          </Card>
        ) : null}

        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={(nextTab) => navigate(`/financials/${nextTab}`)} bottomSpacing />

        {activeTab === 'pricing' ? (
          <Card>
            <CardHeader>
              <CardTitle>Pricing Plans</CardTitle>
              <CardDescription>Seat-based plans with canonical Stripe linkage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Plans Configured</p>
                    <p className="text-2xl font-semibold mt-1">{plans.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Catalog Value</p>
                    <p className="text-2xl font-semibold mt-1">${totalPricingCatalogValue}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Active Coupons</p>
                    <p className="text-2xl font-semibold mt-1">{coupons.filter((coupon) => coupon.active).length}</p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>$/Seat/Month</TableHead>
                    <TableHead>Stripe Price ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{plan.app}</TableCell>
                      <TableCell>
                        <Input
                          value={String(plan.monthly_price_per_seat)}
                          onChange={(event) => {
                            const value = Number(event.target.value)
                            setPlans((current) =>
                              current.map((entry) =>
                                entry.id === plan.id ? { ...entry, monthly_price_per_seat: Number.isNaN(value) ? entry.monthly_price_per_seat : value } : entry,
                              ),
                            )
                          }}
                        />
                      </TableCell>
                      <TableCell>{plan.stripe_price_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {plans.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)]">No pricing plans found.</p> : null}

              <Button disabled={savingPricing} onClick={() => {
                void savePricingUpdates()
              }}>{savingPricing ? 'Saving...' : 'Save Pricing Updates'}</Button>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === 'coupons' ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Generate Coupon</CardTitle>
                <CardDescription>Create promotional coupon codes for campaigns or targeted discounts.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={(event) => {
                  void onCreateCoupon(event)
                }}>
                  <Input placeholder="Code (e.g., SPRING25)" value={newCouponCode} onChange={(event) => setNewCouponCode(event.target.value)} />
                  <Input
                    placeholder="Discount percent"
                    value={newCouponDiscount}
                    onChange={(event) => setNewCouponDiscount(event.target.value)}
                  />
                  <Button type="submit">Create Coupon</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Coupons</CardTitle>
                <CardDescription>Enable or disable discounts globally.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-medium">{coupon.code}</TableCell>
                        <TableCell>{coupon.discount_percent}%</TableCell>
                        <TableCell>{coupon.active ? 'Active' : 'Inactive'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => {
                            void toggleCoupon(coupon.id)
                          }}>
                            {coupon.active ? 'Disable' : 'Enable'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {coupons.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)]">No coupons found.</p> : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === 'reports' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(reportRows.length > 0 ? reportRows : [
              { label: 'MRR', value: '$0' },
              { label: 'Expansion Revenue', value: '—' },
              { label: 'Churn Rate', value: '—' },
              { label: 'StoQR Revenue Share', value: '—' },
            ]).map((report) => (
              <Card key={report.label}>
                <CardContent>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">{report.label}</p>
                  <p className="text-2xl font-semibold mt-1">{report.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
    </BasePage>
  )
}
