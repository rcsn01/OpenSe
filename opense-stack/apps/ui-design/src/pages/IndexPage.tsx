import { Heading, Body, Container, VStack } from '../components/ui'

export function IndexPage() {
  return (
    <Container size="lg" className="py-8">
      <VStack gap={6}>
        <div>
          <Heading level="h1">UI Design Kit</Heading>
          <Body size="body2" muted className="mt-2">
            A comprehensive collection of reusable components for building consistent UIs.
          </Body>
        </div>
        <Body size="body4" muted>
          Use the sidebar to navigate to each component category.
        </Body>
      </VStack>
    </Container>
  )
}
