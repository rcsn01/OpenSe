import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import singleServerSvg from '../assets/architecture/single-server.svg?raw'
import threeServerSvg from '../assets/architecture/three-server.svg?raw'
import threeServerWithBucketSvg from '../assets/architecture/three-server-with-bucket.svg?raw'

const diagrams = [
  {
    id: 'single-server',
    title: 'Single Server',
    description: 'A compact self-hosted deployment with the full stack colocated on one baremetal server.',
    svg: singleServerSvg,
  },
  {
    id: 'three-server',
    title: '3 Server',
    description: 'A split deployment that separates workloads across dedicated frontend, backend, and storage tiers.',
    svg: threeServerSvg,
  },
  {
    id: 'three-server-with-bucket',
    title: '3 Server + Bucket',
    description: 'An extended three-server topology with object storage for bucket-backed assets and files.',
    svg: threeServerWithBucketSvg,
  },
] as const

const switchIntervalMs = 4800

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

  return (
    <div>
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
        <div className="relative min-h-[18rem] overflow-hidden rounded-[1rem] md:min-h-[26rem]">
          {diagrams.map((diagram, index) => {
            const isActive = index === activeIndex

            return (
              <div
                key={diagram.id}
                role="img"
                aria-label={`${diagram.title} architecture diagram`}
                className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'translateX(0) scale(1)' : 'translateX(24px) scale(0.98)',
                  filter: isActive ? 'blur(0px)' : 'blur(5px)',
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <div
                  className="w-full max-w-[56rem] [&>svg]:h-auto [&>svg]:w-full [&>svg]:max-h-[32rem] [&>svg]:drop-shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
                  dangerouslySetInnerHTML={{ __html: diagram.svg }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}