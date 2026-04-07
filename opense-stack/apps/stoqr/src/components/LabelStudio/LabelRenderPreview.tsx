import {
  A4_PAGE,
  LABEL_FONT_STACK,
  type LabelExportPlacement,
  type LabelRenderPlan,
  type LabelTextRenderItem,
} from './labelRenderPlan'

const LABEL_BORDER_COLOR = '#b3b3b3'
const LABEL_TEXT_COLOR = '#111827'
const PAGE_HEADER_COLOR = '#404040'

const getTextAnchor = (textAlign: LabelTextRenderItem['textAlign']) => {
  if (textAlign === 'center') return 'middle'
  if (textAlign === 'right') return 'end'
  return 'start'
}

const getTextX = (textItem: Pick<LabelTextRenderItem, 'x' | 'width' | 'textAlign'>) => {
  if (textItem.textAlign === 'center') return textItem.x + textItem.width / 2
  if (textItem.textAlign === 'right') return textItem.x + textItem.width
  return textItem.x
}

type LabelSvgGroupProps = {
  plan: LabelRenderPlan
  assetMap: Record<string, string>
  offsetX?: number
  offsetY?: number
}

export const LabelSvgGroup = ({ plan, assetMap, offsetX = 0, offsetY = 0 }: LabelSvgGroupProps) => (
  <g transform={`translate(${offsetX} ${offsetY})`}>
    <rect
      x={0}
      y={0}
      width={plan.width}
      height={plan.height}
      fill="#ffffff"
      stroke={plan.borderWidth > 0 ? LABEL_BORDER_COLOR : 'none'}
      strokeWidth={plan.borderWidth}
    />

    {plan.textItems.map((textItem) => (
      <text
        key={textItem.key}
        x={getTextX(textItem)}
        y={textItem.baselineY}
        fill={LABEL_TEXT_COLOR}
        fontFamily={LABEL_FONT_STACK}
        fontSize={textItem.fontSize}
        fontWeight={textItem.fontWeight === 'semibold' ? 600 : 400}
        textAnchor={getTextAnchor(textItem.textAlign)}
      >
        {textItem.text}
      </text>
    ))}

    {plan.assetItems.map((assetItem) => {
      const href = assetMap[assetItem.key]
      const assetLabel = assetItem.kind === 'qr' ? 'QR preview' : 'Barcode preview'

      if (!href) {
        return (
          <g key={assetItem.key} aria-label={assetLabel}>
            <rect
              x={assetItem.x}
              y={assetItem.y}
              width={assetItem.width}
              height={assetItem.height}
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeDasharray="4 3"
            />
          </g>
        )
      }

      return (
        <image
          key={assetItem.key}
          href={href}
          x={assetItem.x}
          y={assetItem.y}
          width={assetItem.width}
          height={assetItem.height}
          preserveAspectRatio={assetItem.kind === 'qr' ? 'xMidYMid meet' : 'none'}
          aria-label={assetLabel}
        />
      )
    })}
  </g>
)

type SingleLabelPreviewSvgProps = {
  plan: LabelRenderPlan
  assetMap: Record<string, string>
  ariaLabel?: string
}

export const SingleLabelPreviewSvg = ({
  plan,
  assetMap,
  ariaLabel = 'Label preview',
}: SingleLabelPreviewSvgProps) => (
  <svg className="label-preview-svg" viewBox={`0 0 ${plan.width} ${plan.height}`} role="img" aria-label={ariaLabel}>
    <LabelSvgGroup plan={plan} assetMap={assetMap} />
  </svg>
)

type LabelPagePreviewSvgProps = {
  templateName: string
  labels: Array<{
    placement: Pick<LabelExportPlacement, 'x' | 'top'>
    plan: LabelRenderPlan
  }>
  assetMap: Record<string, string>
}

export const LabelPagePreviewSvg = ({ templateName, labels, assetMap }: LabelPagePreviewSvgProps) => (
  <svg className="label-preview-page-svg" viewBox={`0 0 ${A4_PAGE.width} ${A4_PAGE.height}`} role="img" aria-label="PDF page preview">
    <rect x={0.5} y={0.5} width={A4_PAGE.width - 1} height={A4_PAGE.height - 1} fill="#ffffff" stroke="#cbd5e1" />
    <text x={24} y={16} fill={PAGE_HEADER_COLOR} fontFamily={LABEL_FONT_STACK} fontSize={9}>
      Template: {templateName}
    </text>
    {labels.map(({ placement, plan }, index) => (
      <LabelSvgGroup
        key={`${placement.x}-${placement.top}-${index}`}
        plan={plan}
        assetMap={assetMap}
        offsetX={placement.x}
        offsetY={placement.top}
      />
    ))}
  </svg>
)