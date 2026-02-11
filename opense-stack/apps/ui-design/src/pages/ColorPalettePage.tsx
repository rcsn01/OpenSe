import { ColorPalette, Body, Container } from '../components/ui'
import { Section } from '../components/shared/PageSection'

export function ColorPalettePage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Color Palette">
        <Body size="body4" muted>
          Two primary colors with 2% lightness steps from dark to clear. Each has duplicate rows: 2
          grey (lighter/desaturated) and 2 darker variants.
        </Body>
        <ColorPalette />
      </Section>
    </Container>
  )
}
