const previewClassName = 'etl-preview h-full w-full'

export const EtlPrivacyPreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect x="58" y="48" width="194" height="172" rx="16" fill="#ffffff" stroke="#dbe7f3" strokeWidth="4" />
    <path d="M58 82h194" stroke="#dbe7f3" strokeWidth="4" />
    <circle cx="80" cy="65" r="4" fill="#cbd5e1" />
    <circle cx="94" cy="65" r="4" fill="#cbd5e1" />
    <circle cx="108" cy="65" r="4" fill="#cbd5e1" />

    <g className="etl-preview__privacy-record etl-preview__privacy-record--1">
      <rect x="12" y="102" width="74" height="18" rx="9" fill="#dbeafe" />
      <rect x="24" y="108" width="24" height="4" rx="2" fill="#60a5fa" />
      <rect x="54" y="108" width="18" height="4" rx="2" fill="#93c5fd" />
    </g>
    <g className="etl-preview__privacy-record etl-preview__privacy-record--2">
      <rect x="18" y="132" width="68" height="18" rx="9" fill="#dcfce7" />
      <rect x="30" y="138" width="18" height="4" rx="2" fill="#22c55e" />
      <rect x="54" y="138" width="20" height="4" rx="2" fill="#86efac" />
    </g>
    <g className="etl-preview__privacy-record etl-preview__privacy-record--3">
      <rect x="8" y="162" width="78" height="18" rx="9" fill="#e0f2fe" />
      <rect x="20" y="168" width="26" height="4" rx="2" fill="#0ea5e9" />
      <rect x="52" y="168" width="22" height="4" rx="2" fill="#7dd3fc" />
    </g>

    <circle cx="156" cy="146" r="58" stroke="#bfdbfe" strokeWidth="4" strokeDasharray="8 10" className="etl-preview__privacy-shield-ring" />

    <g transform="translate(112, 92)">
      <path
        d="M44 0 86 18v34c0 30-18 56-42 70C20 108 2 82 2 52V18Z"
        fill="#eff6ff"
        stroke="#2563eb"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <ellipse cx="44" cy="44" rx="20" ry="8" fill="#dbeafe" stroke="#2563eb" strokeWidth="3" />
      <path d="M24 44v26c0 4 9 8 20 8s20-4 20-8V44" fill="#dbeafe" stroke="#2563eb" strokeWidth="3" />
      <path d="M24 58c0 4 9 8 20 8s20-4 20-8" stroke="#60a5fa" strokeWidth="3" />
    </g>

    <path d="M252 148H308" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="7 8" />
    <g className="etl-preview__privacy-block">
      <circle cx="280" cy="148" r="12" fill="#fff1f2" stroke="#ef4444" strokeWidth="3" />
      <path d="M274 142 286 154M286 142 274 154" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
    </g>

    <g transform="translate(308, 108)" opacity="0.66">
      <path
        d="M18 50c-8.8 0-16-6.3-16-14s6.1-13.2 14.1-13.9C19 13.9 26.8 8 36 8c10.3 0 18.7 7.3 20.3 16.9 8.1.8 14.7 6.8 14.7 14.1 0 7.7-7.2 14-16 14Z"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </g>
  </svg>
)

export const EtlWorkflowPreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect x="42" y="44" width="316" height="212" rx="18" fill="#ffffff" stroke="#dbe7f3" strokeWidth="4" />
    <rect x="58" y="62" width="68" height="176" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="3" />
    <rect x="70" y="82" width="44" height="24" rx="8" fill="#dcfce7" stroke="#86efac" strokeWidth="2" />
    <rect x="70" y="118" width="44" height="24" rx="8" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" />
    <rect x="70" y="154" width="44" height="24" rx="8" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="2" />
    <rect x="144" y="62" width="198" height="176" rx="14" fill="#fbfdff" stroke="#e2e8f0" strokeWidth="3" />

    <g transform="translate(156, 86)">
      <rect x="0" y="0" width="64" height="36" rx="12" fill="#dcfce7" stroke="#22c55e" strokeWidth="3" />
      <rect x="14" y="12" width="36" height="6" rx="3" fill="#16a34a" />
      <circle cx="64" cy="18" r="4" fill="#22c55e" className="etl-preview__workflow-handle" />
    </g>

    <g transform="translate(156, 178)">
      <rect x="0" y="0" width="64" height="36" rx="12" fill="#dbeafe" stroke="#2563eb" strokeWidth="3" />
      <rect x="14" y="12" width="36" height="6" rx="3" fill="#2563eb" />
      <circle cx="0" cy="18" r="4" fill="#2563eb" className="etl-preview__workflow-handle" />
    </g>

    <g className="etl-preview__workflow-drag-node">
      <rect x="70" y="154" width="64" height="36" rx="12" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="3" />
      <rect x="84" y="166" width="36" height="6" rx="3" fill="#7c3aed" />
      <circle cx="70" cy="172" r="4" fill="#8b5cf6" className="etl-preview__workflow-handle" />
      <circle cx="134" cy="172" r="4" fill="#8b5cf6" className="etl-preview__workflow-handle" />
    </g>

    <path d="M220 104C248 104 242 150 250 150" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" className="etl-preview__workflow-connector etl-preview__workflow-connector--1" />
    <path d="M250 150C236 180 212 194 220 196" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" className="etl-preview__workflow-connector etl-preview__workflow-connector--2" />

    <g className="etl-preview__workflow-cursor">
      <path d="M96 196 l 9 22 l 6 -8 l 8 9 l 4 -4 l -8 -8 l 10 -4 z" fill="#0f172a" />
    </g>
  </svg>
)

export const EtlPersistencePreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect x="52" y="46" width="220" height="188" rx="16" fill="#ffffff" stroke="#dbe7f3" strokeWidth="4" />
    <path d="M52 82h220" stroke="#dbe7f3" strokeWidth="4" />
    <circle cx="74" cy="65" r="4" fill="#cbd5e1" />
    <circle cx="88" cy="65" r="4" fill="#cbd5e1" />
    <circle cx="102" cy="65" r="4" fill="#cbd5e1" />

    <g className="etl-preview__persistence-chunk etl-preview__persistence-chunk--1">
      <rect x="94" y="92" width="38" height="18" rx="6" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" />
      <rect x="104" y="98" width="18" height="4" rx="2" fill="#2563eb" />
    </g>
    <g className="etl-preview__persistence-chunk etl-preview__persistence-chunk--2">
      <rect x="142" y="92" width="38" height="18" rx="6" fill="#dcfce7" stroke="#86efac" strokeWidth="2" />
      <rect x="152" y="98" width="18" height="4" rx="2" fill="#16a34a" />
    </g>
    <g className="etl-preview__persistence-chunk etl-preview__persistence-chunk--3">
      <rect x="190" y="92" width="38" height="18" rx="6" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="2" />
      <rect x="200" y="98" width="18" height="4" rx="2" fill="#0ea5e9" />
    </g>

    <g transform="translate(112, 126)">
      <ellipse cx="50" cy="16" rx="38" ry="12" fill="#dbeafe" stroke="#2563eb" strokeWidth="3" />
      <path d="M12 16v56c0 6 17 12 38 12s38-6 38-12V16" fill="#eff6ff" stroke="#2563eb" strokeWidth="3" />
      <path d="M12 48c0 6 17 12 38 12s38-6 38-12" stroke="#60a5fa" strokeWidth="3" />
      <rect x="22" y="42" width="56" height="34" rx="6" fill="#93c5fd" opacity="0.32" className="etl-preview__persistence-fill" />
    </g>

    <path d="M272 150C298 150 314 150 336 150" stroke="#bfdbfe" strokeWidth="3" strokeDasharray="6 8" />

    <g className="etl-preview__persistence-meta-chip">
      <rect x="0" y="0" width="24" height="12" rx="6" fill="#dcfce7" stroke="#22c55e" strokeWidth="2" />
      <rect x="8" y="4" width="8" height="4" rx="2" fill="#16a34a" />
    </g>

    <g transform="translate(304, 108)">
      <path
        d="M18 50c-8.8 0-16-6.3-16-14s6.1-13.2 14.1-13.9C19 13.9 26.8 8 36 8c10.3 0 18.7 7.3 20.3 16.9 8.1.8 14.7 6.8 14.7 14.1 0 7.7-7.2 14-16 14Z"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="22" y="30" width="22" height="4" rx="2" fill="#94a3b8" />
      <rect x="26" y="38" width="14" height="4" rx="2" fill="#cbd5e1" />
    </g>
  </svg>
)

export const EtlGovernancePreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect x="44" y="46" width="312" height="208" rx="18" fill="#ffffff" stroke="#dbe7f3" strokeWidth="4" />
    <rect x="64" y="82" width="116" height="104" rx="14" fill="#eff6ff" stroke="#93c5fd" strokeWidth="3" />
    <rect x="220" y="82" width="116" height="104" rx="14" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 8" />
    <path d="M200 82v104" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="6 8" />

    <rect x="78" y="98" width="52" height="8" rx="4" fill="#2563eb" className="etl-preview__governance-edit etl-preview__governance-edit--1" />
    <rect x="78" y="116" width="74" height="8" rx="4" fill="#60a5fa" className="etl-preview__governance-edit etl-preview__governance-edit--2" />
    <rect x="78" y="144" width="86" height="10" rx="5" fill="#dcfce7" stroke="#86efac" strokeWidth="2" />

    <rect x="236" y="102" width="64" height="8" rx="4" fill="#94a3b8" />
    <rect x="236" y="120" width="78" height="8" rx="4" fill="#cbd5e1" />
    <rect x="236" y="146" width="64" height="10" rx="5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />

    <g className="etl-preview__governance-lock" transform="translate(282, 130)">
      <circle cx="0" cy="0" r="22" fill="#ecfeff" stroke="#0891b2" strokeWidth="3" />
      <rect x="-9" y="-2" width="18" height="14" rx="4" fill="#0891b2" />
      <path d="M-6-2v-4a6 6 0 0 1 12 0v4" stroke="#0891b2" strokeWidth="4" strokeLinecap="round" />
    </g>

    <path d="M92 214C92 184 104 164 122 154" stroke="#60a5fa" strokeWidth="3" strokeDasharray="6 7" />
    <path d="M148 214C148 188 146 164 140 130" stroke="#22c55e" strokeWidth="3" strokeDasharray="6 7" />
    <path d="M280 214C280 190 280 164 280 152" stroke="#0891b2" strokeWidth="3" strokeDasharray="6 7" />

    <g transform="translate(78, 206)">
      <circle cx="14" cy="14" r="14" fill="#eff6ff" stroke="#2563eb" strokeWidth="3" />
      <path d="M2 38c0-9 5.4-14 12-14s12 5 12 14" fill="#eff6ff" stroke="#2563eb" strokeWidth="3" />
    </g>
    <g transform="translate(134, 206)">
      <circle cx="14" cy="14" r="14" fill="#f0fdf4" stroke="#16a34a" strokeWidth="3" />
      <path d="M2 38c0-9 5.4-14 12-14s12 5 12 14" fill="#f0fdf4" stroke="#16a34a" strokeWidth="3" />
    </g>
    <g transform="translate(266, 206)">
      <circle cx="14" cy="14" r="14" fill="#ecfeff" stroke="#0891b2" strokeWidth="3" />
      <path d="M2 38c0-9 5.4-14 12-14s12 5 12 14" fill="#ecfeff" stroke="#0891b2" strokeWidth="3" />
    </g>

    <circle cx="0" cy="0" r="5" fill="#2563eb" className="etl-preview__governance-packet etl-preview__governance-packet--1" />
    <circle cx="0" cy="0" r="5" fill="#22c55e" className="etl-preview__governance-packet etl-preview__governance-packet--2" />
    <circle cx="0" cy="0" r="5" fill="#0891b2" className="etl-preview__governance-packet etl-preview__governance-packet--3" />
  </svg>
)

export const EtlMonitoringPreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect x="44" y="46" width="312" height="208" rx="18" fill="#ffffff" stroke="#dbe7f3" strokeWidth="4" />
    <rect x="62" y="62" width="124" height="52" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="3" />
    <path d="M72 96 98 86 122 92 146 76 174 88" stroke="#0f766e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="etl-preview__monitoring-chart" />

    <rect x="62" y="126" width="188" height="102" rx="14" fill="#0f172a" />
    <rect x="72" y="144" width="168" height="2" fill="#38bdf8" opacity="0.7" className="etl-preview__monitoring-scan" />

    <circle cx="82" cy="158" r="4" fill="#22c55e" />
    <rect x="92" y="154" width="82" height="6" rx="3" fill="#86efac" className="etl-preview__monitoring-line etl-preview__monitoring-line--1" />
    <rect x="180" y="154" width="32" height="6" rx="3" fill="#4ade80" className="etl-preview__monitoring-line etl-preview__monitoring-line--1" />

    <circle cx="82" cy="180" r="4" fill="#38bdf8" />
    <rect x="92" y="176" width="98" height="6" rx="3" fill="#7dd3fc" className="etl-preview__monitoring-line etl-preview__monitoring-line--2" />
    <rect x="196" y="176" width="24" height="6" rx="3" fill="#38bdf8" className="etl-preview__monitoring-line etl-preview__monitoring-line--2" />

    <circle cx="82" cy="202" r="4" fill="#ef4444" className="etl-preview__monitoring-error" />
    <rect x="92" y="198" width="74" height="6" rx="3" fill="#fca5a5" className="etl-preview__monitoring-line etl-preview__monitoring-line--3" />
    <rect x="172" y="198" width="38" height="6" rx="3" fill="#f87171" className="etl-preview__monitoring-line etl-preview__monitoring-line--3" />

    <rect x="266" y="96" width="64" height="20" rx="10" fill="#eff6ff" stroke="#93c5fd" strokeWidth="2" />
    <rect x="282" y="104" width="32" height="4" rx="2" fill="#2563eb" />
    <rect x="266" y="126" width="72" height="20" rx="10" fill="#f0fdf4" stroke="#86efac" strokeWidth="2" />
    <rect x="286" y="134" width="30" height="4" rx="2" fill="#16a34a" />

    <path d="M250 182C266 182 278 182 292 182" stroke="#fca5a5" strokeWidth="3" strokeDasharray="6 8" />
    <g className="etl-preview__monitoring-alert">
      <rect x="264" y="168" width="78" height="28" rx="14" fill="#fff1f2" stroke="#ef4444" strokeWidth="2" />
      <circle cx="280" cy="182" r="4" fill="#ef4444" />
      <rect x="290" y="178" width="32" height="4" rx="2" fill="#f87171" />
    </g>
  </svg>
)

export const EtlCodePreview = () => (
  <svg viewBox="0 0 400 300" className={previewClassName} fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect x="46" y="54" width="308" height="190" rx="18" fill="#ffffff" stroke="#dbe7f3" strokeWidth="4" />

    <g transform="translate(68, 124)">
      <rect x="0" y="0" width="46" height="46" rx="12" fill="#eff6ff" stroke="#60a5fa" strokeWidth="3" />
      <rect x="12" y="12" width="22" height="6" rx="3" fill="#2563eb" />
      <rect x="12" y="24" width="16" height="6" rx="3" fill="#60a5fa" />
    </g>

    <path d="M114 148H156" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 8" />
    <path d="M248 148H294" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 8" />

    <g transform="translate(156, 86)">
      <rect x="0" y="0" width="92" height="120" rx="16" fill="#0f172a" />
      <rect x="0" y="0" width="92" height="120" rx="16" fill="none" stroke="#22c55e" strokeWidth="2.5" className="etl-preview__code-node" />
      <path d="M22 28 14 40l8 12" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 28 78 40l-8 12" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="60" width="48" height="6" rx="3" fill="#38bdf8" className="etl-preview__code-line etl-preview__code-line--1" />
      <rect x="22" y="78" width="34" height="6" rx="3" fill="#22c55e" className="etl-preview__code-line etl-preview__code-line--2" />
      <rect x="22" y="96" width="56" height="6" rx="3" fill="#f59e0b" className="etl-preview__code-line etl-preview__code-line--3" />
    </g>

    <g transform="translate(294, 118)">
      <rect x="0" y="0" width="42" height="22" rx="8" fill="#dcfce7" stroke="#22c55e" strokeWidth="3" />
      <rect x="10" y="30" width="34" height="18" rx="7" fill="#dbeafe" stroke="#2563eb" strokeWidth="3" />
    </g>

    <circle cx="0" cy="0" r="5" fill="#2563eb" className="etl-preview__code-packet-in" />
    <circle cx="0" cy="0" r="5" fill="#22c55e" className="etl-preview__code-packet-out" />
  </svg>
)

export const etlAnimationStyles = `
  @keyframes etl-preview-privacy-record {
    0%, 12% { transform: translateX(0); opacity: 0; }
    22%, 58% { transform: translateX(78px); opacity: 1; }
    76%, 100% { transform: translateX(118px); opacity: 0; }
  }

  @keyframes etl-preview-privacy-shield {
    0%, 100% { transform: scale(1); opacity: 0.35; }
    50% { transform: scale(1.08); opacity: 0.92; }
  }

  @keyframes etl-preview-block-pulse {
    0%, 100% { opacity: 0.45; transform: scale(0.88); }
    35%, 70% { opacity: 1; transform: scale(1); }
  }

  @keyframes etl-preview-workflow-drag {
    0%, 15% { transform: translate(0, 0); }
    38%, 64% { transform: translate(178px, -22px); }
    100% { transform: translate(178px, -22px); }
  }

  @keyframes etl-preview-workflow-cursor {
    0%, 16% { transform: translate(0, 0); opacity: 0; }
    22%, 56% { transform: translate(126px, -38px); opacity: 1; }
    72%, 100% { transform: translate(138px, -10px); opacity: 0.96; }
  }

  @keyframes etl-preview-draw-stroke {
    0%, 24% { stroke-dashoffset: 220; }
    48%, 100% { stroke-dashoffset: 0; }
  }

  @keyframes etl-preview-handle-pulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.18); }
  }

  @keyframes etl-preview-chunk-drop {
    0%, 10% { transform: translateY(0); opacity: 0; }
    20%, 46% { transform: translateY(24px); opacity: 1; }
    64%, 100% { transform: translateY(86px); opacity: 0; }
  }

  @keyframes etl-preview-db-fill {
    0%, 100% { transform: scaleY(0.72); opacity: 0.22; }
    50% { transform: scaleY(1); opacity: 0.42; }
  }

  @keyframes etl-preview-meta-travel {
    0%, 24% { transform: translate(250px, 144px) scale(0.7); opacity: 0; }
    34%, 78% { transform: translate(304px, 144px) scale(1); opacity: 1; }
    100% { transform: translate(326px, 144px) scale(0.82); opacity: 0; }
  }

  @keyframes etl-preview-governance-edit {
    0%, 16% { transform: scaleX(0.18); opacity: 0.3; }
    36%, 78% { transform: scaleX(1); opacity: 1; }
    100% { transform: scaleX(0.72); opacity: 0.8; }
  }

  @keyframes etl-preview-lock-pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.08); opacity: 1; }
  }

  @keyframes etl-preview-governance-packet-1 {
    0% { transform: translate(92px, 220px) scale(0); opacity: 0; }
    14% { transform: translate(92px, 220px) scale(1); opacity: 1; }
    74% { transform: translate(122px, 154px) scale(1); opacity: 1; }
    100% { transform: translate(122px, 154px) scale(0); opacity: 0; }
  }

  @keyframes etl-preview-governance-packet-2 {
    0% { transform: translate(148px, 220px) scale(0); opacity: 0; }
    14% { transform: translate(148px, 220px) scale(1); opacity: 1; }
    74% { transform: translate(140px, 130px) scale(1); opacity: 1; }
    100% { transform: translate(140px, 130px) scale(0); opacity: 0; }
  }

  @keyframes etl-preview-governance-packet-3 {
    0% { transform: translate(280px, 220px) scale(0); opacity: 0; }
    14% { transform: translate(280px, 220px) scale(1); opacity: 1; }
    74% { transform: translate(280px, 154px) scale(1); opacity: 1; }
    100% { transform: translate(280px, 154px) scale(0); opacity: 0; }
  }

  @keyframes etl-preview-monitoring-scan {
    0%, 10% { transform: translateY(0); opacity: 0; }
    20%, 84% { transform: translateY(56px); opacity: 0.92; }
    100% { transform: translateY(74px); opacity: 0; }
  }

  @keyframes etl-preview-line-grow {
    0%, 18% { transform: scaleX(0.12); opacity: 0.2; }
    34%, 100% { transform: scaleX(1); opacity: 1; }
  }

  @keyframes etl-preview-error-pulse {
    0%, 100% { transform: scale(1); opacity: 0.72; }
    50% { transform: scale(1.35); opacity: 1; }
  }

  @keyframes etl-preview-alert-pop {
    0%, 42% { transform: translateY(12px); opacity: 0; }
    56%, 86% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-4px); opacity: 0; }
  }

  @keyframes etl-preview-code-node {
    0%, 100% { opacity: 0.72; }
    50% { opacity: 1; }
  }

  @keyframes etl-preview-code-line {
    0%, 16% { transform: scaleX(0.1); opacity: 0.25; }
    34%, 84% { transform: scaleX(1); opacity: 1; }
    100% { transform: scaleX(0.9); opacity: 0.8; }
  }

  @keyframes etl-preview-code-packet-in {
    0% { transform: translate(114px, 148px) scale(0); opacity: 0; }
    16% { transform: translate(114px, 148px) scale(1); opacity: 1; }
    60% { transform: translate(156px, 148px) scale(1); opacity: 1; }
    100% { transform: translate(172px, 148px) scale(0); opacity: 0; }
  }

  @keyframes etl-preview-code-packet-out {
    0%, 48% { transform: translate(248px, 148px) scale(0); opacity: 0; }
    60% { transform: translate(248px, 148px) scale(1); opacity: 1; }
    90% { transform: translate(294px, 148px) scale(1); opacity: 1; }
    100% { transform: translate(314px, 148px) scale(0); opacity: 0; }
  }

  .etl-preview__privacy-record,
  .etl-preview__privacy-shield-ring,
  .etl-preview__privacy-block,
  .etl-preview__workflow-drag-node,
  .etl-preview__workflow-cursor,
  .etl-preview__workflow-handle,
  .etl-preview__persistence-chunk,
  .etl-preview__persistence-fill,
  .etl-preview__governance-edit,
  .etl-preview__governance-lock,
  .etl-preview__monitoring-scan,
  .etl-preview__monitoring-line,
  .etl-preview__monitoring-error,
  .etl-preview__monitoring-alert,
  .etl-preview__code-node,
  .etl-preview__code-line {
    transform-box: fill-box;
  }

  .etl-preview__privacy-record,
  .etl-preview__workflow-drag-node,
  .etl-preview__workflow-cursor,
  .etl-preview__governance-lock,
  .etl-preview__monitoring-error,
  .etl-preview__monitoring-alert,
  .etl-preview__code-node {
    transform-origin: center;
  }

  .etl-preview__privacy-record {
    animation: etl-preview-privacy-record 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .etl-preview__privacy-record--2 { animation-delay: 0.22s; }
  .etl-preview__privacy-record--3 { animation-delay: 0.44s; }

  .etl-preview__privacy-shield-ring {
    transform-origin: center;
    animation: etl-preview-privacy-shield 2.8s ease-in-out infinite;
  }

  .etl-preview__privacy-block {
    animation: etl-preview-block-pulse 2.2s ease-in-out infinite;
  }

  .etl-preview__workflow-drag-node {
    animation: etl-preview-workflow-drag 5.2s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
  }

  .etl-preview__workflow-cursor {
    animation: etl-preview-workflow-cursor 5.2s ease-in-out infinite;
  }

  .etl-preview__workflow-connector,
  .etl-preview__monitoring-chart {
    stroke-dasharray: 220;
    stroke-dashoffset: 220;
    animation: etl-preview-draw-stroke 5.2s ease-out infinite;
  }

  .etl-preview__workflow-connector--2 { animation-delay: 0.32s; }

  .etl-preview__workflow-handle {
    transform-origin: center;
    animation: etl-preview-handle-pulse 1.8s ease-in-out infinite;
  }

  .etl-preview__persistence-chunk {
    transform-origin: center top;
    animation: etl-preview-chunk-drop 4.8s ease-in infinite;
  }

  .etl-preview__persistence-chunk--2 { animation-delay: 0.18s; }
  .etl-preview__persistence-chunk--3 { animation-delay: 0.36s; }

  .etl-preview__persistence-fill {
    transform-origin: center bottom;
    animation: etl-preview-db-fill 3.4s ease-in-out infinite;
  }

  .etl-preview__persistence-meta-chip {
    animation: etl-preview-meta-travel 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .etl-preview__governance-edit {
    transform-origin: left center;
    animation: etl-preview-governance-edit 4.8s ease-in-out infinite;
  }

  .etl-preview__governance-edit--2 { animation-delay: 0.22s; }

  .etl-preview__governance-lock {
    animation: etl-preview-lock-pulse 2.6s ease-in-out infinite;
  }

  .etl-preview__governance-packet--1 {
    animation: etl-preview-governance-packet-1 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .etl-preview__governance-packet--2 {
    animation: etl-preview-governance-packet-2 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.34s;
  }

  .etl-preview__governance-packet--3 {
    animation: etl-preview-governance-packet-3 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.7s;
  }

  .etl-preview__monitoring-scan {
    animation: etl-preview-monitoring-scan 4.6s linear infinite;
  }

  .etl-preview__monitoring-line {
    transform-origin: left center;
    animation: etl-preview-line-grow 4.6s ease-in-out infinite;
  }

  .etl-preview__monitoring-line--2 { animation-delay: 0.24s; }
  .etl-preview__monitoring-line--3 { animation-delay: 0.48s; }

  .etl-preview__monitoring-error {
    animation: etl-preview-error-pulse 1.6s ease-in-out infinite;
  }

  .etl-preview__monitoring-alert {
    animation: etl-preview-alert-pop 4.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite;
  }

  .etl-preview__code-node {
    animation: etl-preview-code-node 2.8s ease-in-out infinite;
  }

  .etl-preview__code-line {
    transform-origin: left center;
    animation: etl-preview-code-line 4.8s ease-in-out infinite;
  }

  .etl-preview__code-line--2 { animation-delay: 0.2s; }
  .etl-preview__code-line--3 { animation-delay: 0.4s; }

  .etl-preview__code-packet-in {
    animation: etl-preview-code-packet-in 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .etl-preview__code-packet-out {
    animation: etl-preview-code-packet-out 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .etl-preview [class*='etl-preview__'] {
      animation: none !important;
    }
  }
`