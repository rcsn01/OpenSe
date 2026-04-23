import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

const diagrams = [
  {
    id: 'single-server',
    title: 'Single Server',
    description: 'A compact self-hosted deployment with the full stack colocated on one baremetal server.',
  },
  {
    id: 'three-server',
    title: '3 Server',
    description: 'A split deployment that separates workloads across dedicated frontend, backend, and storage tiers.',
  },
  {
    id: 'three-server-with-bucket',
    title: '3 Server + Bucket',
    description: 'An extended three-server topology with object storage for bucket-backed assets and files.',
  },
] as const

type DiagramId = (typeof diagrams)[number]['id']

type DiagramNode = {
  id: string
  label: string
  y: number
}

type ServerCardProps = {
  x: number
  y: number
  width?: number
  height?: number
  opacity: number
  scale?: number
  title: string
  subtitle: string
  badge: string
  badgeFill: string
  badgeText: string
  chipFill: string
  chipStroke: string
  chipText: string
  nodes: DiagramNode[]
  visibleNodeIds: Set<string>
}

const switchIntervalMs = 5200
const serverMotionTransition = 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease'
const nodeMotionTransition = 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease'
const connectionMotionTransition = 'opacity 500ms ease'

const frontNodes: DiagramNode[] = [
  { id: 'accounts', label: 'Accounts', y: 110 },
  { id: 'opense', label: 'OpenSe', y: 150 },
  { id: 'stoqr', label: 'Open-StoQr', y: 190 },
  { id: 'admin', label: 'Admin', y: 230 },
  { id: 'ui-design', label: 'UI Design', y: 270 },
  { id: 'gateway', label: 'Kong + Auth', y: 310 },
  { id: 'compute', label: 'Functions + Realtime', y: 350 },
  { id: 'data', label: 'Postgres + Storage', y: 390 },
] as const

const backNodes: DiagramNode[] = [
  { id: 'kong', label: 'Kong', y: 110 },
  { id: 'gotrue', label: 'GoTrue', y: 150 },
  { id: 'functions', label: 'Functions', y: 190 },
  { id: 'realtime', label: 'Realtime', y: 230 },
  { id: 'postgrest', label: 'PostgREST', y: 270 },
  { id: 'graphql', label: 'pg_graphql', y: 310 },
  { id: 'meta', label: 'pg-meta', y: 350 },
] as const

const storeNodes: DiagramNode[] = [
  { id: 'postgresql', label: 'PostgreSQL', y: 120 },
  { id: 'volumes', label: 'Longhorn Volumes', y: 164 },
  { id: 'sync', label: 'Disk Sync', y: 208 },
  { id: 'storage-gateway', label: 'Storage Gateway', y: 252 },
] as const

const externalNodes: DiagramNode[] = [
  { id: 'storage-server', label: 'Storage Server', y: 102 },
  { id: 'aws-bucket', label: 'AWS Bucket', y: 150 },
  { id: 'gcs-bucket', label: 'GCS Bucket', y: 198 },
] as const

const frontAccent = {
  badgeFill: 'color-mix(in srgb, var(--color-primary-light) 86%, white)',
  badgeText: 'var(--color-primary-hover)',
  chipFill: 'color-mix(in srgb, var(--color-primary-light) 74%, white)',
  chipStroke: 'color-mix(in srgb, var(--color-primary-hover) 18%, transparent)',
}

const backAccent = {
  badgeFill: 'color-mix(in srgb, var(--color-info-light) 76%, white)',
  badgeText: 'var(--color-info)',
  chipFill: 'color-mix(in srgb, var(--color-info-light) 68%, white)',
  chipStroke: 'color-mix(in srgb, var(--color-info) 16%, transparent)',
}

const storageAccent = {
  badgeFill: 'color-mix(in srgb, var(--color-success-light) 72%, white)',
  badgeText: 'var(--color-success)',
  chipFill: 'color-mix(in srgb, var(--color-success-light) 62%, white)',
  chipStroke: 'color-mix(in srgb, var(--color-success) 18%, transparent)',
}

const bucketAccent = {
  badgeFill: 'color-mix(in srgb, var(--color-warning-light) 72%, white)',
  badgeText: 'var(--color-secondary)',
  chipFill: 'color-mix(in srgb, var(--color-warning-light) 66%, white)',
  chipStroke: 'color-mix(in srgb, var(--color-secondary) 20%, transparent)',
}

const ServerCard = ({
  x,
  y,
  width = 182,
  height = 438,
  opacity,
  scale = 1,
  title,
  subtitle,
  badge,
  badgeFill,
  badgeText,
  chipFill,
  chipStroke,
  chipText,
  nodes,
  visibleNodeIds,
}: ServerCardProps) => {
  return (
    <g
      style={{
        opacity,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: 'top left',
        transition: serverMotionTransition,
      }}
    >
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={30}
        ry={30}
        style={{
          fill: 'rgba(255,255,255,0.94)',
          stroke: 'color-mix(in srgb, var(--color-border) 82%, transparent)',
          strokeWidth: 1.5,
        }}
      />
      <rect x={18} y={18} width={width - 36} height={32} rx={16} ry={16} style={{ fill: badgeFill }} />
      <text x={width / 2} y={39} textAnchor="middle" fontSize="12" fontWeight="700" fill={badgeText}>
        {badge}
      </text>
      <text x={18} y={78} fontSize="15" fontWeight="700" fill="var(--color-heading)">
        {title}
      </text>
      <text x={18} y={98} fontSize="11" fill="var(--color-body)">
        {subtitle}
      </text>

      {nodes.map((node) => {
        const isVisible = visibleNodeIds.has(node.id)

        return (
          <g
            key={node.id}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0px) scale(1)' : 'translateX(18px) scale(0.94)',
              transformOrigin: 'center',
              transition: nodeMotionTransition,
            }}
          >
            <rect
              x={18}
              y={node.y}
              width={width - 36}
              height={28}
              rx={14}
              ry={14}
              style={{
                fill: chipFill,
                stroke: chipStroke,
                strokeWidth: 1,
              }}
            />
            <text x={width / 2} y={node.y + 18} textAnchor="middle" fontSize="11" fontWeight="600" fill={chipText}>
              {node.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

type ConnectionProps = {
  points: string
  opacity: number
}

const Connection = ({ points, opacity }: ConnectionProps) => {
  return (
    <polyline
      points={points}
      fill="none"
      stroke="color-mix(in srgb, var(--color-primary-hover) 52%, var(--color-secondary) 22%)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      markerEnd="url(#architecture-arrow)"
      vectorEffect="non-scaling-stroke"
      style={{
        opacity,
        transition: connectionMotionTransition,
        strokeDasharray: '10 10',
        animation: opacity > 0 ? 'architecture-flow 16s linear infinite' : 'none',
      }}
    />
  )
}

const UserRail = () => {
  return (
    <g>
      {['User 1', 'User 2', 'User 3', 'User 4', 'User 5'].map((label, index) => {
        const y = 140 + index * 44

        return (
          <g key={label}>
            <rect
              x={24}
              y={y}
              width={80}
              height={28}
              rx={14}
              ry={14}
              style={{ fill: 'rgba(255,255,255,0.92)', stroke: 'color-mix(in srgb, var(--color-border) 86%, transparent)' }}
            />
            <text x={64} y={y + 18} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-heading)">
              {label}
            </text>
          </g>
        )
      })}

      <rect
        x={118}
        y={212}
        width={118}
        height={86}
        rx={22}
        ry={22}
        style={{
          fill: 'color-mix(in srgb, var(--color-warning-light) 76%, white)',
          stroke: 'color-mix(in srgb, var(--color-secondary) 24%, transparent)',
          strokeWidth: 1.5,
        }}
      />
      <text x={177} y={246} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-heading)">
        Cloudflare
      </text>
      <text x={177} y={264} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-heading)">
        Tunnel
      </text>
      <text x={177} y={284} textAnchor="middle" fontSize="11" fill="var(--color-body)">
        Shared ingress
      </text>
    </g>
  )
}

export const ArchitectureDiagramCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % diagrams.length)
    }, switchIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const activeDiagram = diagrams[activeIndex]
  const activeId = activeDiagram.id as DiagramId
  const isSplit = activeId !== 'single-server'
  const hasExternalStorage = activeId === 'three-server-with-bucket'

  const frontVisibleNodes = new Set(
    isSplit
      ? ['accounts', 'opense', 'stoqr', 'admin', 'ui-design']
      : ['accounts', 'opense', 'stoqr', 'admin', 'gateway', 'compute', 'data'],
  )
  const backVisibleNodes = new Set(isSplit ? ['kong', 'gotrue', 'functions', 'realtime', 'postgrest', 'graphql', 'meta'] : [])
  const storeVisibleNodes = new Set(isSplit ? ['postgresql', 'volumes', 'sync', 'storage-gateway'] : [])
  const externalVisibleNodes = new Set(hasExternalStorage ? ['storage-server', 'aws-bucket', 'gcs-bucket'] : [])

  const frontX = isSplit ? 264 : 434
  const frontY = 54
  const frontScale = isSplit ? 1 : 1.04

  const backX = isSplit ? 482 : 470
  const backY = 54
  const backOpacity = isSplit ? 1 : 0

  const storeX = isSplit ? 700 : 506
  const storeY = 54
  const storeOpacity = isSplit ? 1 : 0

  const externalX = hasExternalStorage ? 892 : 930
  const externalY = 112
  const externalOpacity = hasExternalStorage ? 1 : 0

  return (
    <div>
      <style>{`
        @keyframes architecture-flow {
          to {
            stroke-dashoffset: -40;
          }
        }
      `}</style>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
            Deployment Profiles
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-heading)]">
            {activeDiagram.title}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-body)]">{activeDiagram.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {diagrams.map((diagram, index) => {
              const isActive = index === activeIndex

              return (
                <button
                  key={diagram.id}
                  type="button"
                  aria-label={`Show ${diagram.title} architecture diagram`}
                  aria-pressed={isActive}
                  onClick={() => setActiveIndex(index)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--color-primary-light) 85%, white)'
                      : 'rgba(255,255,255,0.7)',
                    border: isActive
                      ? '1px solid color-mix(in srgb, var(--color-primary-hover) 28%, transparent)'
                      : '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
                    color: 'var(--color-heading)',
                    boxShadow: isActive ? 'var(--opense-shell-shadow-card)' : 'none',
                  }}
                >
                  {diagram.title}
                </button>
              )
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Show previous architecture diagram"
              onClick={() => setActiveIndex((current) => (current - 1 + diagrams.length) % diagrams.length)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/80 text-[var(--color-heading)] transition-transform duration-200 hover:-translate-y-0.5"
              style={{ borderColor: 'var(--opense-shell-border)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Show next architecture diagram"
              onClick={() => setActiveIndex((current) => (current + 1) % diagrams.length)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/80 text-[var(--color-heading)] transition-transform duration-200 hover:-translate-y-0.5"
              style={{ borderColor: 'var(--opense-shell-border)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        className="mt-6 rounded-[1.25rem] border border-dashed bg-white/72 p-3 md:p-5"
        style={{ borderColor: 'color-mix(in srgb, var(--color-border) 92%, transparent)' }}
      >
        <div className="overflow-hidden rounded-[1rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.76))] p-2 md:p-4">
          <svg
            role="img"
            aria-label={`${activeDiagram.title} architecture diagram`}
            viewBox="0 0 1080 560"
            className="h-auto w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker id="architecture-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="color-mix(in srgb, var(--color-primary-hover) 52%, var(--color-secondary) 22%)" />
              </marker>
            </defs>

            <rect x="0" y="0" width="1080" height="560" rx="24" ry="24" fill="rgba(255,255,255,0.56)" />

            <g style={{ opacity: isSplit ? 1 : 0, transition: connectionMotionTransition }}>
              <rect
                x="242"
                y="30"
                width="660"
                height="470"
                rx="26"
                ry="26"
                fill="none"
                stroke="color-mix(in srgb, var(--color-border) 80%, transparent)"
                strokeDasharray="8 8"
              />
              <text x="572" y="52" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-muted-foreground)">
                Managed by K3s
              </text>
            </g>

            <UserRail />

            <line
              x1="104"
              y1="154"
              x2="118"
              y2="236"
              stroke="color-mix(in srgb, var(--color-border-hover) 82%, transparent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="104"
              y1="198"
              x2="118"
              y2="254"
              stroke="color-mix(in srgb, var(--color-border-hover) 82%, transparent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="104"
              y1="242"
              x2="118"
              y2="272"
              stroke="color-mix(in srgb, var(--color-border-hover) 82%, transparent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="104"
              y1="286"
              x2="118"
              y2="290"
              stroke="color-mix(in srgb, var(--color-border-hover) 82%, transparent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="104"
              y1="330"
              x2="118"
              y2="308"
              stroke="color-mix(in srgb, var(--color-border-hover) 82%, transparent)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <g
              style={{
                opacity: isSplit ? 1 : 0,
                transform: isSplit ? 'translate(0px, 0px) scale(1)' : 'translate(14px, 0px) scale(0.94)',
                transformOrigin: 'top left',
                transition: serverMotionTransition,
              }}
            >
              <rect
                x="242"
                y="232"
                width="122"
                height="48"
                rx="24"
                ry="24"
                fill="rgba(255,255,255,0.95)"
                stroke="color-mix(in srgb, var(--color-border) 84%, transparent)"
              />
              <text x="303" y="252" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-heading)">
                Load Balancer
              </text>
              <text x="303" y="268" textAnchor="middle" fontSize="10" fill="var(--color-body)">
                Traffic fan-out
              </text>
            </g>

            <Connection points="236,255 320,255 434,210" opacity={isSplit ? 0 : 1} />
            <Connection points="236,255 242,255" opacity={isSplit ? 1 : 0} />
            <Connection points="364,255 392,255 434,255" opacity={isSplit ? 1 : 0} />
            <Connection points="354,255 470,255 482,255" opacity={isSplit ? 1 : 0} />
            <Connection points="664,255 700,255" opacity={isSplit ? 1 : 0} />
            <Connection points="882,255 892,255" opacity={hasExternalStorage ? 1 : 0} />

            <ServerCard
              x={frontX}
              y={frontY}
              opacity={1}
              scale={frontScale}
              title="Baremetal Server 1"
              subtitle={isSplit ? 'Frontend apps and management surfaces' : 'Frontend, backend, and storage on one node'}
              badge={isSplit ? 'Frontend' : 'All-in-One'}
              badgeFill={frontAccent.badgeFill}
              badgeText={frontAccent.badgeText}
              chipFill={frontAccent.chipFill}
              chipStroke={frontAccent.chipStroke}
              chipText="var(--color-heading)"
              nodes={frontNodes}
              visibleNodeIds={frontVisibleNodes}
            />

            <ServerCard
              x={backX}
              y={backY}
              opacity={backOpacity}
              title="Baremetal Server 2"
              subtitle="API, auth, and realtime services"
              badge="Backend"
              badgeFill={backAccent.badgeFill}
              badgeText={backAccent.badgeText}
              chipFill={backAccent.chipFill}
              chipStroke={backAccent.chipStroke}
              chipText="var(--color-heading)"
              nodes={backNodes}
              visibleNodeIds={backVisibleNodes}
            />

            <ServerCard
              x={storeX}
              y={storeY}
              opacity={storeOpacity}
              title="Baremetal Server 3"
              subtitle="Stateful data, storage, and replication"
              badge="Storage"
              badgeFill={storageAccent.badgeFill}
              badgeText={storageAccent.badgeText}
              chipFill={storageAccent.chipFill}
              chipStroke={storageAccent.chipStroke}
              chipText="var(--color-heading)"
              nodes={storeNodes}
              visibleNodeIds={storeVisibleNodes}
            />

            <g
              style={{
                opacity: externalOpacity,
                transform: externalOpacity ? `translate(${externalX}px, ${externalY}px) scale(1)` : `translate(${externalX + 20}px, ${externalY}px) scale(0.94)`,
                transformOrigin: 'top left',
                transition: serverMotionTransition,
              }}
            >
              <rect
                x="0"
                y="0"
                width="156"
                height="260"
                rx="28"
                ry="28"
                style={{
                  fill: 'rgba(255,255,255,0.94)',
                  stroke: 'color-mix(in srgb, var(--color-border) 84%, transparent)',
                  strokeWidth: 1.5,
                }}
              />
              <rect x="16" y="18" width="124" height="32" rx="16" ry="16" style={{ fill: bucketAccent.badgeFill }} />
              <text x="78" y="39" textAnchor="middle" fontSize="12" fontWeight="700" fill={bucketAccent.badgeText}>
                External Storage
              </text>
              <text x="18" y="78" fontSize="15" fontWeight="700" fill="var(--color-heading)">
                Bucket Sync
              </text>
              <text x="18" y="98" fontSize="11" fill="var(--color-body)">
                Object storage targets
              </text>

              {externalNodes.map((node) => {
                const isVisible = externalVisibleNodes.has(node.id)

                return (
                  <g
                    key={node.id}
                    style={{
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateX(0px) scale(1)' : 'translateX(18px) scale(0.94)',
                      transformOrigin: 'center',
                      transition: nodeMotionTransition,
                    }}
                  >
                    <rect
                      x="18"
                      y={node.y}
                      width="120"
                      height="30"
                      rx="15"
                      ry="15"
                      style={{
                        fill: bucketAccent.chipFill,
                        stroke: bucketAccent.chipStroke,
                        strokeWidth: 1,
                      }}
                    />
                    <text x="78" y={node.y + 19} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-heading)">
                      {node.label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}