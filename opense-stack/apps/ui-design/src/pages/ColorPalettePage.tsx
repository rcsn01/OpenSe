import { ColorPalette, Shades, Body, Container } from '../components/ui'
import { Section } from '../components/shared/PageSection'

export function ColorPalettePage() {
  return (
    <Container size="lg" className="py-8 space-y-12">
      <Section title="Color Palette">
        <Body size="body4" muted>
          Two primary colors with 10-step lightness scale from brightest to darkest. Base color at step 5.
        </Body>
        <ColorPalette />
      </Section>
      <Section title="Shades">
        <Shades />
      </Section>
    </Container>
  )
}
