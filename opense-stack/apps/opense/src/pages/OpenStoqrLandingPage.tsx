import { BellRing, Boxes, LayoutDashboard, Printer, QrCode, TrendingUp, UserRoundCog } from 'lucide-react'
import { ProductLandingPage, type ProductLandingFeature } from '../components/ProductLandingPage'

const previewClassName = 'stoqr-preview h-full w-full'

const StoqrDashboardPreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect x="50" y="40" width="300" height="200" rx="12" fill="#ffffff" stroke="#f1f5f9" strokeWidth="4" />
    <path d="M50 80h300" stroke="#f1f5f9" strokeWidth="4" />
    <circle cx="70" cy="60" r="4" fill="#cbd5e1" />
    <circle cx="85" cy="60" r="4" fill="#cbd5e1" />
    <circle cx="100" cy="60" r="4" fill="#cbd5e1" />

    <g transform="translate(130, 150)">
      <circle cx="0" cy="0" r="35" stroke="#ffedd5" strokeWidth="14" fill="none" />
      <circle
        cx="0"
        cy="0"
        r="35"
        stroke="#f97316"
        strokeWidth="14"
        fill="none"
        strokeDasharray="220"
        strokeLinecap="round"
        className="stoqr-preview__donut-main"
      />
      <circle
        cx="0"
        cy="0"
        r="35"
        stroke="#fbbf24"
        strokeWidth="14"
        fill="none"
        strokeDasharray="220"
        strokeLinecap="round"
        className="stoqr-preview__donut-sec"
      />
    </g>

    <g transform="translate(200, 190)">
      <rect x="0" y="-40" width="18" height="40" rx="4" fill="#fbbf24" className="stoqr-preview__bar stoqr-preview__bar--1" />
      <rect x="30" y="-70" width="18" height="70" rx="4" fill="#f97316" className="stoqr-preview__bar stoqr-preview__bar--2" />
      <rect x="60" y="-55" width="18" height="55" rx="4" fill="#ea580c" className="stoqr-preview__bar stoqr-preview__bar--3" />
    </g>

    <g transform="translate(200, 190)">
      <path
        d="M10 -50 L40 -90 L70 -70 L100 -110"
        stroke="#334155"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stoqr-preview__trend"
      />
      <circle cx="100" cy="-110" r="6" fill="#334155" className="stoqr-preview__trend-dot" />
    </g>
  </svg>
)

const StoqrScannerPreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <line x1="80" y1="230" x2="320" y2="230" stroke="#e2e8f0" strokeWidth="4" strokeDasharray="8 12" strokeLinecap="round" />

    <g className="stoqr-preview__scanner-barcode">
      <rect x="100" y="100" width="60" height="50" rx="6" fill="#fff" stroke="#cbd5e1" strokeWidth="3" />
      <rect x="110" y="112" width="4" height="26" fill="#334155" />
      <rect x="118" y="112" width="8" height="26" fill="#334155" />
      <rect x="130" y="112" width="4" height="26" fill="#334155" />
      <rect x="138" y="112" width="6" height="26" fill="#334155" />
      <rect x="148" y="112" width="4" height="26" fill="#334155" />
    </g>

    <g transform="translate(240, 70)">
      <rect x="0" y="0" width="80" height="130" rx="12" fill="#fff" stroke="#334155" strokeWidth="4" />
      <path
        d="M20 25 L15 25 L15 30 M60 25 L65 25 L65 30 M20 65 L15 65 L15 60 M60 65 L65 65 L65 60"
        stroke="#ea580c"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points="15,70 65,70 85,160 -5,160" fill="#ef4444" opacity="0.9" className="stoqr-preview__laser" />
      <rect x="15" y="68" width="50" height="4" fill="#ef4444" className="stoqr-preview__laser" />
    </g>
  </svg>
)

const StoqrLabelPreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect x="40" y="60" width="60" height="170" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="3" />
    <rect x="55" y="80" width="30" height="4" rx="2" fill="#94a3b8" />
    <rect x="55" y="90" width="20" height="4" rx="2" fill="#94a3b8" />
    <path d="M55 120 v16 M60 120 v16 M65 120 v16 M73 120 v16 M80 120 v16 M85 120 v16" stroke="#cbd5e1" strokeWidth="2" />
    <rect x="55" y="160" width="25" height="15" rx="2" stroke="#cbd5e1" strokeWidth="3" fill="none" />

    <rect x="140" y="80" width="220" height="130" rx="6" fill="#fff" stroke="#f97316" strokeWidth="3" strokeDasharray="8 8" />

    <g className="stoqr-preview__label-content">
      <g transform="translate(160, 100)">
        <rect x="0" y="0" width="100" height="30" rx="4" fill="#fff" stroke="#94a3b8" strokeWidth="2" />
        <path d="M10 6 v18 M16 6 v18 M20 6 v18 M28 6 v18 M34 6 v18 M40 6 v18 M48 6 v18 M56 6 v18 M60 6 v18 M68 6 v18 M74 6 v18 M80 6 v18 M88 6 v18 M92 6 v18" stroke="#334155" strokeWidth="2" />
      </g>

      <g transform="translate(180, 150)">
        <rect x="0" y="0" width="140" height="30" rx="4" fill="#fef3c7" />
        <text
          x="70"
          y="20"
          fill="#ea580c"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="14"
          fontWeight="700"
          textAnchor="middle"
        >
          ITEM-A1B2C3
        </text>
      </g>
    </g>

    <g className="stoqr-preview__cursor">
      <path d="M220 170 l 8 20 l 5 -7 l 7 8 l 4 -3 l -7 -8 l 8 -3 z" fill="#1e293b" />
    </g>
  </svg>
)

const StoqrProcurementPreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <path d="M120 150 Q 160 150 180 150" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="4 4" />
    <path d="M240 150 Q 260 150 280 150" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="4 4" />

    <g transform="translate(60, 110)">
      <path d="M0 70 L0 30 L20 10 L20 30 L40 10 L40 70 Z" fill="#fff" stroke="#475569" strokeWidth="4" strokeLinejoin="round" />
      <rect x="12" y="40" width="16" height="30" fill="#475569" />
    </g>

    <g transform="translate(280, 105)">
      <path d="M0 0 H35 L50 15 V75 H0 Z" fill="#fff" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
      <path d="M35 0 V15 H50" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="25" cy="50" r="6" fill="#22c55e" className="stoqr-preview__doc-check" />
    </g>

    <g className="stoqr-preview__box-transit">
      <rect x="180" y="125" width="50" height="50" rx="4" fill="#fde68a" stroke="#f59e0b" strokeWidth="3" />
      <line x1="205" y1="125" x2="205" y2="175" stroke="#f59e0b" strokeWidth="3" />
      <line x1="180" y1="140" x2="230" y2="140" stroke="#f59e0b" strokeWidth="3" />
    </g>
  </svg>
)

const StoqrAlertsPreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <line x1="60" y1="130" x2="160" y2="130" stroke="#ef4444" strokeWidth="4" strokeDasharray="10 8" />

    <rect x="70" y="150" width="80" height="30" rx="6" fill="#fbbf24" stroke="#d97706" strokeWidth="3" className="stoqr-preview__alert-box" />

    <g transform="translate(180, 145)">
      <path d="M0 -30 Q 30 0 0 30" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" fill="none" className="stoqr-preview__wave stoqr-preview__wave--1" />
      <path d="M15 -50 Q 55 0 15 50" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" fill="none" className="stoqr-preview__wave stoqr-preview__wave--2" />
      <path d="M30 -70 Q 80 0 30 70" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" fill="none" className="stoqr-preview__wave stoqr-preview__wave--3" />
    </g>

    <g transform="translate(260, 100)">
      <rect x="0" y="0" width="60" height="100" rx="10" fill="#1e293b" />
      <rect x="5" y="10" width="50" height="80" rx="6" fill="#fff" />
      <rect x="10" y="20" width="40" height="20" rx="4" fill="#fef2f2" stroke="#fca5a5" strokeWidth="2" className="stoqr-preview__toast" />
      <circle cx="16" cy="30" r="3" fill="#ef4444" className="stoqr-preview__toast" />
      <line x1="22" y1="28" x2="42" y2="28" stroke="#f87171" strokeWidth="2" strokeLinecap="round" className="stoqr-preview__toast" />
      <line x1="22" y1="32" x2="35" y2="32" stroke="#f87171" strokeWidth="2" strokeLinecap="round" className="stoqr-preview__toast" />
    </g>
  </svg>
)

const StoqrRolesPreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <path d="M 120 70 Q 200 70 260 140" stroke="#22c55e" strokeWidth="3" fill="none" />
    <path d="M 120 150 Q 180 150 250 160" stroke="#eab308" strokeWidth="3" strokeDasharray="6 6" fill="none" />
    <path d="M 120 230 Q 200 230 250 180" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="2 6" fill="none" strokeLinecap="round" />

    <g transform="translate(270, 130)">
      <ellipse cx="40" cy="15" rx="30" ry="10" fill="#fff" stroke="#1e293b" strokeWidth="3" />
      <path d="M10 15 v25 c0 5.5 13.4 10 30 10 s30 -4.5 30 -10 v-25" fill="#fff" stroke="#1e293b" strokeWidth="3" />
      <ellipse cx="40" cy="28" rx="30" ry="10" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" className="stoqr-preview__server-scan" />
    </g>

    <g transform="translate(80, 50)">
      <circle cx="20" cy="15" r="10" fill="#fff" stroke="#ea580c" strokeWidth="3" />
      <path d="M0 45 c0 -10 8 -15 20 -15 s20 5 20 15" fill="#fff" stroke="#ea580c" strokeWidth="3" />
      <polygon points="20,8 23,13 28,13 24,16 25,21 20,18 15,21 16,16 12,13 17,13" fill="#ea580c" />
    </g>

    <circle cx="0" cy="0" r="4" fill="#22c55e" className="stoqr-preview__packet stoqr-preview__packet--1" />
    <circle cx="0" cy="0" r="4" fill="#eab308" className="stoqr-preview__packet stoqr-preview__packet--2" />
    <circle cx="0" cy="0" r="4" fill="#94a3b8" className="stoqr-preview__packet stoqr-preview__packet--3" />

    <g transform="translate(80, 130)">
      <circle cx="20" cy="15" r="10" fill="#fff" stroke="#334155" strokeWidth="3" />
      <path d="M0 45 c0 -10 8 -15 20 -15 s20 5 20 15" fill="#fff" stroke="#334155" strokeWidth="3" />
      <rect x="15" y="10" width="10" height="10" fill="#334155" />
    </g>

    <g transform="translate(80, 210)">
      <circle cx="20" cy="15" r="10" fill="#fff" stroke="#94a3b8" strokeWidth="3" />
      <path d="M0 45 c0 -10 8 -15 20 -15 s20 5 20 15" fill="#fff" stroke="#94a3b8" strokeWidth="3" />
      <circle cx="20" cy="15" r="4" fill="#94a3b8" />
    </g>
  </svg>
)

const featureCards: ProductLandingFeature[] = [
  {
    title: 'Intelligent Dashboard',
    description:
      'Monitor total inventory value, stock levels, and pending orders at a glance. Visual charts track inventory trends and usage depletion over time.',
    icon: LayoutDashboard,
    preview: <StoqrDashboardPreview />,
  },
  {
    title: 'Built-in Scanner',
    description:
      'Camera-based barcode and QR code scanning right from your web browser. Do quick stock lookups, add, or remove inventory efficiently on the floor.',
    icon: QrCode,
    preview: <StoqrScannerPreview />,
  },
  {
    title: 'Label Studio',
    description:
      'Design custom labels with variable fields (Barcode, SKU, Price). Use template libraries for products, shelves, or bins, and export to PDF/PNG for batch printing.',
    icon: Printer,
    preview: <StoqrLabelPreview />,
  },
  {
    title: 'Procurement & Reporting',
    description:
      'Create purchase orders, manage suppliers, and track receiving workflows. Generate dead stock identification and inventory valuation reports.',
    icon: TrendingUp,
    preview: <StoqrProcurementPreview />,
  },
  {
    title: 'Automated Alerts',
    description:
      'Set custom rules for low stock notifications, reorder point triggers, and expiration warnings. Receive alerts via email or push notifications.',
    icon: BellRing,
    preview: <StoqrAlertsPreview />,
  },
  {
    title: 'Role-Based Access',
    description:
      'Granular user management. Invite team members with specific roles (admin, editor, scanner). Maintain full audit trails and activity logs for accountability.',
    icon: UserRoundCog,
    preview: <StoqrRolesPreview />,
  },
]

const featureIconClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:color-mix(in_srgb,var(--color-secondary)_14%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning-light)_44%,white)] text-[var(--color-secondary)]'

const stoqrAnimationStyles = `
  @keyframes stoqr-preview-draw-donut-main {
    0%, 10% { stroke-dashoffset: 220; }
    40%, 100% { stroke-dashoffset: 80; }
  }

  @keyframes stoqr-preview-draw-donut-sec {
    0%, 30% { stroke-dashoffset: 220; }
    60%, 100% { stroke-dashoffset: 160; }
  }

  @keyframes stoqr-preview-grow-bar {
    0%, 20% { transform: scaleY(0); }
    50%, 100% { transform: scaleY(1); }
  }

  @keyframes stoqr-preview-draw-trend {
    0%, 40% { stroke-dasharray: 200; stroke-dashoffset: 200; }
    70%, 100% { stroke-dashoffset: 0; }
  }

  @keyframes stoqr-preview-pop-dot {
    0%, 60% { opacity: 0; transform: scale(0); }
    75%, 100% { opacity: 1; transform: scale(1); }
  }

  @keyframes stoqr-preview-slide-barcode {
    0%, 20% { transform: translateX(120px); opacity: 0; }
    30%, 80% { transform: translateX(0); opacity: 1; }
    90%, 100% { transform: translateX(-50px); opacity: 0; }
  }

  @keyframes stoqr-preview-pulse-laser {
    0%, 30%, 80%, 100% { opacity: 0; transform: scaleY(0.5); }
    40%, 70% { opacity: 0.9; transform: scaleY(1); }
  }

  @keyframes stoqr-preview-assemble-label {
    0%, 10% { transform: translate(-80px, -20px); opacity: 0; }
    25%, 85% { transform: translate(0, 0); opacity: 1; }
    95%, 100% { transform: translate(0, 0); opacity: 0; }
  }

  @keyframes stoqr-preview-cursor-move {
    0%, 10% { transform: translate(-120px, -20px); }
    25%, 50% { transform: translate(0, 0); }
    60%, 85% { transform: translate(40px, 30px); }
    95%, 100% { transform: translate(20px, 80px); opacity: 0; }
  }

  @keyframes stoqr-preview-box-transit {
    0% { transform: translateX(-120px); opacity: 0; }
    15%, 25% { transform: translateX(-120px); opacity: 1; }
    45%, 55% { transform: translateX(0); opacity: 1; }
    75%, 85% { transform: translateX(120px); opacity: 1; }
    90%, 100% { transform: translateX(120px); opacity: 0; }
  }

  @keyframes stoqr-preview-pop-check {
    0%, 70% { transform: scale(0); opacity: 0; }
    80%, 95% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0); opacity: 0; }
  }

  @keyframes stoqr-preview-box-drop {
    0%, 20% { transform: translateY(-40px); opacity: 0; }
    30%, 80% { transform: translateY(0); opacity: 1; }
    90%, 100% { transform: translateY(20px); opacity: 0; }
  }

  @keyframes stoqr-preview-wave-pulse {
    0%, 35% { opacity: 0; transform: scale(0.8) translateX(-10px); }
    50% { opacity: 1; }
    80%, 100% { opacity: 0; transform: scale(1.2) translateX(10px); }
  }

  @keyframes stoqr-preview-toast-pop {
    0%, 45% { opacity: 0; transform: translateY(10px); }
    55%, 85% { opacity: 1; transform: translateY(0); }
    95%, 100% { opacity: 0; transform: translateY(-5px); }
  }

  @keyframes stoqr-preview-packet-fly-1 {
    0% { transform: translate(120px, 70px) scale(0); opacity: 0; }
    10% { transform: translate(120px, 70px) scale(1); opacity: 1; }
    90% { transform: translate(260px, 140px) scale(1); opacity: 1; }
    100% { transform: translate(260px, 140px) scale(0); opacity: 0; }
  }

  @keyframes stoqr-preview-packet-fly-2 {
    0% { transform: translate(120px, 150px) scale(0); opacity: 0; }
    10% { transform: translate(120px, 150px) scale(1); opacity: 1; }
    90% { transform: translate(250px, 160px) scale(1); opacity: 1; }
    100% { transform: translate(250px, 160px) scale(0); opacity: 0; }
  }

  @keyframes stoqr-preview-packet-fly-3 {
    0% { transform: translate(120px, 230px) scale(0); opacity: 0; }
    10% { transform: translate(120px, 230px) scale(1); opacity: 1; }
    90% { transform: translate(250px, 180px) scale(1); opacity: 1; }
    100% { transform: translate(250px, 180px) scale(0); opacity: 0; }
  }

  @keyframes stoqr-preview-server-blink {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .stoqr-preview__donut-main {
    stroke-dashoffset: 220;
    animation: stoqr-preview-draw-donut-main 4s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
  }

  .stoqr-preview__donut-sec {
    stroke-dashoffset: 220;
    animation: stoqr-preview-draw-donut-sec 4s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
  }

  .stoqr-preview__bar,
  .stoqr-preview__trend-dot,
  .stoqr-preview__laser,
  .stoqr-preview__label-content,
  .stoqr-preview__cursor,
  .stoqr-preview__box-transit,
  .stoqr-preview__doc-check,
  .stoqr-preview__alert-box,
  .stoqr-preview__wave,
  .stoqr-preview__toast,
  .stoqr-preview__packet {
    transform-box: fill-box;
  }

  .stoqr-preview__bar {
    transform-origin: center bottom;
    animation: stoqr-preview-grow-bar 4s ease-out infinite alternate;
  }

  .stoqr-preview__bar--1 { animation-delay: 0.1s; }
  .stoqr-preview__bar--2 { animation-delay: 0.2s; }
  .stoqr-preview__bar--3 { animation-delay: 0.3s; }

  .stoqr-preview__trend {
    stroke-dasharray: 200;
    stroke-dashoffset: 200;
    animation: stoqr-preview-draw-trend 4s ease-out infinite alternate;
  }

  .stoqr-preview__trend-dot {
    transform-origin: center;
    animation: stoqr-preview-pop-dot 4s ease-out infinite alternate;
  }

  .stoqr-preview__scanner-barcode {
    animation: stoqr-preview-slide-barcode 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .stoqr-preview__laser {
    transform-origin: center top;
    animation: stoqr-preview-pulse-laser 5s ease-in-out infinite;
  }

  .stoqr-preview__label-content {
    transform-origin: center;
    animation: stoqr-preview-assemble-label 6s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
  }

  .stoqr-preview__cursor {
    animation: stoqr-preview-cursor-move 6s ease-in-out infinite;
  }

  .stoqr-preview__box-transit {
    animation: stoqr-preview-box-transit 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .stoqr-preview__doc-check {
    transform-origin: center;
    animation: stoqr-preview-pop-check 5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite;
  }

  .stoqr-preview__alert-box {
    animation: stoqr-preview-box-drop 4s ease-in-out infinite;
  }

  .stoqr-preview__wave {
    transform-origin: center;
    animation: stoqr-preview-wave-pulse 4s ease-out infinite;
  }

  .stoqr-preview__wave--2 { animation-delay: 0.15s; }
  .stoqr-preview__wave--3 { animation-delay: 0.3s; }

  .stoqr-preview__toast {
    animation: stoqr-preview-toast-pop 4s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite;
  }

  .stoqr-preview__packet {
    transform-origin: center;
  }

  .stoqr-preview__packet--1 {
    animation: stoqr-preview-packet-fly-1 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .stoqr-preview__packet--2 {
    animation: stoqr-preview-packet-fly-2 3s cubic-bezier(0.4, 0, 0.2, 1) infinite 1s;
  }

  .stoqr-preview__packet--3 {
    animation: stoqr-preview-packet-fly-3 3s cubic-bezier(0.4, 0, 0.2, 1) infinite 2s;
  }

  .stoqr-preview__server-scan {
    animation: stoqr-preview-server-blink 1.5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .stoqr-preview [class*='stoqr-preview__'] {
      animation: none !important;
    }
  }
`

export const OpenStoqrLandingPage = () => {
  return (
    <>
      <style>{stoqrAnimationStyles}</style>

      <ProductLandingPage
        landingContext="stoqr"
        background={(
          <>
            <div className="absolute inset-0 bg-[var(--color-background)]" />
            <div
              className="absolute left-[-9rem] top-[-2rem] h-[22rem] w-[22rem] rounded-full blur-3xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning-light) 52%, white)' }}
            />
            <div
              className="absolute right-[-8rem] top-[18rem] h-[18rem] w-[18rem] rounded-full blur-3xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-secondary) 12%, white)' }}
            />
          </>
        )}
        heroIcon={Boxes}
        iconClassName={featureIconClass}
        title="Open-StoQr"
        subtitle="Physical inventory, digitally mastered."
        subtitleStyle={{ color: 'color-mix(in srgb, var(--color-secondary) 82%, #8e5f2b)' }}
        description="Track, scan, and manage your inventory operations with high customization and accessibility. Perfect for modern warehouses, retail backrooms, and distributed asset management."
        features={featureCards}
        ctaPanelStyle={{ backgroundColor: 'color-mix(in srgb, var(--color-secondary) 34%, #2f1707)' }}
        ctaIcon={QrCode}
        ctaTitle="Ready to Organize Your Assets?"
        ctaDescription="Upgrade your team's efficiency with Open-StoQr. Open source, highly customizable, and easy to deploy for your organization."
        ctaLabel="Deploy Open-StoQr"
        ctaTestId="stoqr-deploy-open-stoqr"
      />
    </>
  )
}