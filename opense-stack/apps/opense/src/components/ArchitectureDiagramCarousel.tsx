import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
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

type DiagramDefinition = (typeof diagrams)[number]
type DiagramId = DiagramDefinition['id']

type BoundingBox = {
  x: number
  y: number
  width: number
  height: number
}

type ViewBox = {
  minX: number
  minY: number
  width: number
  height: number
}

type ParsedOccurrence = {
  key: string
  label: string | null
  order: number
  markup: string
  bounds: BoundingBox
}

type ParsedDiagram = {
  id: DiagramId
  viewBox: ViewBox
  items: ParsedOccurrence[]
}

type MorphSceneItem = {
  key: string
  label: string | null
  fallbackMarkup: string
  canonicalBounds: BoundingBox
  defaultOrder: number
  boundsByDiagram: Partial<Record<DiagramId, BoundingBox>>
  orderByDiagram: Partial<Record<DiagramId, number>>
  markupByDiagram: Partial<Record<DiagramId, string>>
}

type MorphScene = {
  items: MorphSceneItem[]
  viewBox: ViewBox
}

const geometryTags = new Set(['rect', 'path', 'ellipse', 'circle', 'line', 'polyline', 'polygon'])

const itemTransition =
  'left 900ms cubic-bezier(0.22, 1, 0.36, 1), top 900ms cubic-bezier(0.22, 1, 0.36, 1), width 900ms cubic-bezier(0.22, 1, 0.36, 1), height 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms ease, transform 900ms cubic-bezier(0.22, 1, 0.36, 1), filter 520ms ease'

const scenePadding = {
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
} as const

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const parseNumber = (value: string | null, fallback = 0) => {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

const formatBoxValue = (value: number) => `${Math.max(value, 0)}%`

const ensureBounds = (bounds: BoundingBox): BoundingBox => ({
  x: bounds.x,
  y: bounds.y,
  width: Math.max(bounds.width, 1),
  height: Math.max(bounds.height, 1),
})

const expandBounds = (bounds: BoundingBox, padding: number): BoundingBox =>
  ensureBounds({
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  })

const mergeBounds = (boxes: Array<BoundingBox | null>): BoundingBox | null => {
  const validBoxes = boxes.filter((box): box is BoundingBox => box !== null)

  if (validBoxes.length === 0) {
    return null
  }

  const minX = Math.min(...validBoxes.map((box) => box.x))
  const minY = Math.min(...validBoxes.map((box) => box.y))
  const maxX = Math.max(...validBoxes.map((box) => box.x + box.width))
  const maxY = Math.max(...validBoxes.map((box) => box.y + box.height))

  return ensureBounds({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  })
}

const parsePointsBounds = (value: string | null): BoundingBox | null => {
  if (!value) {
    return null
  }

  const numbers = value
    .trim()
    .split(/[\s,]+/)
    .map((segment) => Number.parseFloat(segment))
    .filter((segment) => Number.isFinite(segment))

  if (numbers.length < 4) {
    return null
  }

  const points: Array<{ x: number; y: number }> = []

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push({ x: numbers[index] ?? 0, y: numbers[index + 1] ?? 0 })
  }

  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))

  return ensureBounds({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  })
}

const parsePathBounds = (value: string | null): BoundingBox | null => {
  if (!value) {
    return null
  }

  const numbers = Array.from(value.matchAll(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi), (match) => Number.parseFloat(match[0])).filter(
    (segment) => Number.isFinite(segment),
  )

  if (numbers.length < 2) {
    return null
  }

  const points: Array<{ x: number; y: number }> = []

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push({ x: numbers[index] ?? 0, y: numbers[index + 1] ?? 0 })
  }

  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))

  return ensureBounds({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  })
}

const getTextBounds = (element: Element): BoundingBox | null => {
  const textContent = collapseWhitespace(element.textContent ?? '')

  if (!textContent) {
    return null
  }

  const fontSize = parseNumber(element.getAttribute('font-size'), 12)
  const x = parseNumber(element.getAttribute('x'))
  const y = parseNumber(element.getAttribute('y'))
  const width = Math.max(textContent.length * fontSize * 0.58, fontSize)
  const height = fontSize * 1.35

  return ensureBounds({
    x: x - width / 2,
    y: y - height,
    width,
    height,
  })
}

const getElementBounds = (element: Element): BoundingBox | null => {
  const tagName = element.tagName.toLowerCase()

  if (tagName === 'rect') {
    return ensureBounds({
      x: parseNumber(element.getAttribute('x')),
      y: parseNumber(element.getAttribute('y')),
      width: parseNumber(element.getAttribute('width'), 1),
      height: parseNumber(element.getAttribute('height'), 1),
    })
  }

  if (tagName === 'circle') {
    const radius = parseNumber(element.getAttribute('r'))
    const cx = parseNumber(element.getAttribute('cx'))
    const cy = parseNumber(element.getAttribute('cy'))

    return ensureBounds({
      x: cx - radius,
      y: cy - radius,
      width: radius * 2,
      height: radius * 2,
    })
  }

  if (tagName === 'ellipse') {
    const rx = parseNumber(element.getAttribute('rx'))
    const ry = parseNumber(element.getAttribute('ry'))
    const cx = parseNumber(element.getAttribute('cx'))
    const cy = parseNumber(element.getAttribute('cy'))

    return ensureBounds({
      x: cx - rx,
      y: cy - ry,
      width: rx * 2,
      height: ry * 2,
    })
  }

  if (tagName === 'line') {
    const x1 = parseNumber(element.getAttribute('x1'))
    const y1 = parseNumber(element.getAttribute('y1'))
    const x2 = parseNumber(element.getAttribute('x2'))
    const y2 = parseNumber(element.getAttribute('y2'))

    return ensureBounds({
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    })
  }

  if (tagName === 'polyline' || tagName === 'polygon') {
    return parsePointsBounds(element.getAttribute('points'))
  }

  if (tagName === 'path') {
    return parsePathBounds(element.getAttribute('d'))
  }

  if (tagName === 'text') {
    return getTextBounds(element)
  }

  return null
}

const getGroupBounds = (group: Element) =>
  mergeBounds(Array.from(group.querySelectorAll('*')).map((element) => getElementBounds(element)).filter((box) => box !== null))

const hasGeometry = (group: Element) => Array.from(group.querySelectorAll('*')).some((element) => geometryTags.has(element.tagName.toLowerCase()))

const getGroupLabel = (group: Element) => {
  const foreignObjectText = Array.from(group.querySelectorAll('foreignObject'))
    .map((element) => collapseWhitespace(element.textContent ?? ''))
    .find(Boolean)

  if (foreignObjectText && foreignObjectText !== 'Text is not SVG - cannot display') {
    return foreignObjectText
  }

  const fallbackText = Array.from(group.querySelectorAll('text'))
    .map((element) => collapseWhitespace(element.textContent ?? ''))
    .filter(Boolean)
    .find((text) => text !== 'Text is not SVG - cannot display')

  return fallbackText ?? null
}

const parseViewBox = (svgElement: Element): ViewBox => {
  const viewBox = svgElement.getAttribute('viewBox')

  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/\s+/)
      .map((segment) => Number.parseFloat(segment))

    if (parts.length === 4 && parts.every((segment) => Number.isFinite(segment))) {
      return {
        minX: parts[0] ?? 0,
        minY: parts[1] ?? 0,
        width: parts[2] ?? 1,
        height: parts[3] ?? 1,
      }
    }
  }

  return {
    minX: 0,
    minY: 0,
    width: parseNumber(svgElement.getAttribute('width'), 1),
    height: parseNumber(svgElement.getAttribute('height'), 1),
  }
}

const parseDiagram = (diagram: DiagramDefinition): ParsedDiagram => {
  if (typeof DOMParser === 'undefined') {
    return {
      id: diagram.id,
      viewBox: { minX: 0, minY: 0, width: 1, height: 1 },
      items: [],
    }
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(diagram.svg, 'image/svg+xml')
  const svgElement = document.querySelector('svg')
  const rootGroup = document.querySelector('svg > g')

  if (!svgElement || !rootGroup) {
    return {
      id: diagram.id,
      viewBox: { minX: 0, minY: 0, width: 1, height: 1 },
      items: [],
    }
  }

  const serializer = new XMLSerializer()
  const topLevelGroups = Array.from(rootGroup.children).filter(
    (element): element is Element => element.nodeType === Node.ELEMENT_NODE && element.tagName.toLowerCase() === 'g',
  )

  const occurrences: Array<Omit<ParsedOccurrence, 'key'>> = []
  const consumedIndexes = new Set<number>()

  for (let index = 0; index < topLevelGroups.length; index += 1) {
    if (consumedIndexes.has(index)) {
      continue
    }

    const currentGroup = topLevelGroups[index]
    const currentLabel = getGroupLabel(currentGroup)
    const currentHasGeometry = hasGeometry(currentGroup)
    const nextGroup = topLevelGroups[index + 1]

    if (!currentLabel && currentHasGeometry && nextGroup) {
      const nextLabel = getGroupLabel(nextGroup)
      const nextHasGeometry = hasGeometry(nextGroup)

      if (nextLabel && !nextHasGeometry) {
        const bounds = mergeBounds([getGroupBounds(currentGroup), getGroupBounds(nextGroup)])

        if (bounds) {
          occurrences.push({
            label: nextLabel,
            order: index,
            markup: `${serializer.serializeToString(currentGroup)}${serializer.serializeToString(nextGroup)}`,
            bounds: expandBounds(bounds, 12),
          })
        }

        consumedIndexes.add(index)
        consumedIndexes.add(index + 1)
        index += 1
        continue
      }
    }

    if (currentLabel) {
      const bounds = getGroupBounds(currentGroup)

      if (bounds) {
        occurrences.push({
          label: currentLabel,
          order: index,
          markup: serializer.serializeToString(currentGroup),
          bounds: expandBounds(bounds, 12),
        })
      }

      consumedIndexes.add(index)
    }
  }

  let unlabeledIndex = 0

  for (let index = 0; index < topLevelGroups.length; index += 1) {
    if (consumedIndexes.has(index)) {
      continue
    }

    const bounds = getGroupBounds(topLevelGroups[index])

    if (!bounds) {
      continue
    }

    unlabeledIndex += 1
    occurrences.push({
      label: null,
      order: index,
      markup: serializer.serializeToString(topLevelGroups[index]),
      bounds: expandBounds(bounds, 8),
    })
  }

  const labelOccurrences = new Map<string, number>()
  let unlabeledCounter = 0

  return {
    id: diagram.id,
    viewBox: parseViewBox(svgElement),
    items: occurrences
      .sort((left, right) => left.order - right.order)
      .map((occurrence) => {
        if (!occurrence.label) {
          unlabeledCounter += 1

          return {
            ...occurrence,
            key: `unlabeled:${diagram.id}:${unlabeledCounter}`,
          }
        }

        const normalizedLabel = collapseWhitespace(occurrence.label).toLowerCase()
        const count = (labelOccurrences.get(normalizedLabel) ?? 0) + 1
        labelOccurrences.set(normalizedLabel, count)

        return {
          ...occurrence,
          key: `label:${normalizedLabel}:${count}`,
        }
      }),
  }
}

const buildMorphScene = (): MorphScene => {
  const parsedDiagrams = diagrams.map((diagram) => parseDiagram(diagram))
  const sceneItems = new Map<string, MorphSceneItem>()

  for (const parsedDiagram of parsedDiagrams) {
    for (const item of parsedDiagram.items) {
      const existingItem = sceneItems.get(item.key)

      if (!existingItem) {
        sceneItems.set(item.key, {
          key: item.key,
          label: item.label,
          fallbackMarkup: item.markup,
          canonicalBounds: item.bounds,
          defaultOrder: item.order,
          boundsByDiagram: { [parsedDiagram.id]: item.bounds },
          orderByDiagram: { [parsedDiagram.id]: item.order },
          markupByDiagram: { [parsedDiagram.id]: item.markup },
        })

        continue
      }

      existingItem.boundsByDiagram[parsedDiagram.id] = item.bounds
      existingItem.orderByDiagram[parsedDiagram.id] = item.order
      existingItem.markupByDiagram[parsedDiagram.id] = item.markup
    }
  }

  const fallbackMinX = Math.min(...parsedDiagrams.map((diagram) => diagram.viewBox.minX))
  const fallbackMinY = Math.min(...parsedDiagrams.map((diagram) => diagram.viewBox.minY))
  const fallbackMaxX = Math.max(...parsedDiagrams.map((diagram) => diagram.viewBox.minX + diagram.viewBox.width))
  const fallbackMaxY = Math.max(...parsedDiagrams.map((diagram) => diagram.viewBox.minY + diagram.viewBox.height))

  return {
    items: Array.from(sceneItems.values()).sort((left, right) => {
      const topDifference = left.canonicalBounds.y - right.canonicalBounds.y

      if (Math.abs(topDifference) > 1) {
        return topDifference
      }

      return left.canonicalBounds.x - right.canonicalBounds.x
    }),
    viewBox: {
      minX: fallbackMinX - scenePadding.left,
      minY: fallbackMinY - scenePadding.top,
      width: fallbackMaxX - fallbackMinX + scenePadding.left + scenePadding.right,
      height: fallbackMaxY - fallbackMinY + scenePadding.top + scenePadding.bottom,
    },
  }
}

const getItemStyle = (item: MorphSceneItem, activeDiagramId: DiagramId, sceneViewBox: ViewBox) => {
  const activeBounds = item.boundsByDiagram[activeDiagramId] ?? item.canonicalBounds
  const isVisible = Boolean(item.boundsByDiagram[activeDiagramId])

  return {
    left: formatBoxValue(((activeBounds.x - sceneViewBox.minX) / sceneViewBox.width) * 100),
    top: formatBoxValue(((activeBounds.y - sceneViewBox.minY) / sceneViewBox.height) * 100),
    width: formatBoxValue((activeBounds.width / sceneViewBox.width) * 100),
    height: formatBoxValue((activeBounds.height / sceneViewBox.height) * 100),
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'scale(1)' : 'scale(0.96)',
    filter: isVisible ? 'blur(0px)' : 'blur(6px)',
    zIndex: item.orderByDiagram[activeDiagramId] ?? item.defaultOrder,
    transition: itemTransition,
    transformOrigin: 'center center',
    overflow: 'visible',
    pointerEvents: 'none' as const,
  }
}

const DiagramItemSvg = ({ item, activeDiagramId, sceneViewBox }: { item: MorphSceneItem; activeDiagramId: DiagramId; sceneViewBox: ViewBox }) => {
  const style = getItemStyle(item, activeDiagramId, sceneViewBox)
  const activeBounds = item.boundsByDiagram[activeDiagramId] ?? item.canonicalBounds
  const activeMarkup = item.markupByDiagram[activeDiagramId] ?? item.fallbackMarkup

  return (
    <svg
      aria-hidden="true"
      className="absolute block [will-change:left,top,width,height,opacity,transform,filter]"
      style={style}
      viewBox={`${activeBounds.x} ${activeBounds.y} ${activeBounds.width} ${activeBounds.height}`}
      preserveAspectRatio="none"
    >
      <g dangerouslySetInnerHTML={{ __html: activeMarkup }} />
    </svg>
  )
}

export const ArchitectureDiagramCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeDiagram = diagrams[activeIndex]
  const morphScene = useMemo(() => buildMorphScene(), [])

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
        <div
          role="img"
          aria-label={`${activeDiagram.title} architecture diagram`}
          className="relative min-h-[22rem] overflow-hidden rounded-[1rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.8))] md:min-h-[34rem]"
        >
          <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4">
            <div
              className="relative h-full max-h-full w-auto max-w-full"
              style={{ aspectRatio: `${morphScene.viewBox.width} / ${morphScene.viewBox.height}` }}
            >
              {morphScene.items.map((item) => (
                <DiagramItemSvg
                  key={item.key}
                  item={item}
                  activeDiagramId={activeDiagram.id}
                  sceneViewBox={morphScene.viewBox}
                />
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/24 to-transparent" />
        </div>
      </div>
    </div>
  )
}