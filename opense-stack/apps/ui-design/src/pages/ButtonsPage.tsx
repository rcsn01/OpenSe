import { Sun, Moon } from 'lucide-react'
import { Button, Container, HStack } from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

export function ButtonsPage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Buttons">
        <SubSection title="Variants">
          <HStack wrap>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </HStack>
        </SubSection>

        <SubSection title="Sizes">
          <HStack wrap align="end">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </HStack>
        </SubSection>

        <SubSection title="States">
          <HStack wrap>
            <Button>Default</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
          </HStack>
        </SubSection>

        <SubSection title="With Icons">
          <HStack wrap>
            <Button size="icon" variant="outline">
              <Sun className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <Moon className="h-4 w-4" />
            </Button>
          </HStack>
        </SubSection>
      </Section>
    </Container>
  )
}
