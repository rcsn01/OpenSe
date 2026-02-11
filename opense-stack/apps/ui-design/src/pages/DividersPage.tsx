import { Body, Divider, Container, HStack } from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

export function DividersPage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Dividers">
        <SubSection title="Horizontal Divider">
          <Divider />
        </SubSection>
        <SubSection title="Divider with Label">
          <Divider label="OR" />
        </SubSection>
        <SubSection title="Vertical Divider">
          <HStack gap={4} className="h-12">
            <Body size="body4">Left content</Body>
            <Divider orientation="vertical" />
            <Body size="body4">Right content</Body>
          </HStack>
        </SubSection>
      </Section>
    </Container>
  )
}
