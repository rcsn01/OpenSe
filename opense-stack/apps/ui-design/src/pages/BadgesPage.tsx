import { Badge, Container, HStack } from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

export function BadgesPage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Badges">
        <SubSection title="Variants">
          <HStack wrap>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="outline">Outline</Badge>
          </HStack>
        </SubSection>
        <SubSection title="Sizes">
          <HStack wrap align="center">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </HStack>
        </SubSection>
      </Section>
    </Container>
  )
}
