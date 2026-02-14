import { Body, Container, VStack, HStack, Grid, Card } from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

export function SpacingPage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Spacing & Layout">
        <SubSection title="Gap Scale (gap-1 to gap-6)">
          <VStack>
            {([1, 2, 3, 4, 5, 6] as const).map((g) => (
              <div key={g} className="flex items-center gap-4">
                <Body size="body4" className="w-16 shrink-0 font-mono">
                  gap-{g}
                </Body>
                <div className="flex items-center" style={{ gap: `var(--gap-${g})` }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-[var(--radius-sm)] bg-[var(--color-primary)]"
                    />
                  ))}
                </div>
              </div>
            ))}
          </VStack>
        </SubSection>

        <SubSection title="Container Sizes">
          <VStack>
            {(['sm', 'md', 'lg', 'xl', 'full'] as const).map((size) => (
              <div key={size}>
                <Body size="body5" className="mb-1 font-mono">
                  Container size="{size}"
                </Body>
                <Container
                  size={size}
                  className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] p-3"
                >
                  <Body size="body4" muted>
                    Content area
                  </Body>
                </Container>
              </div>
            ))}
          </VStack>
        </SubSection>

        <SubSection title="VStack & HStack">
          <HStack wrap>
            <Card padding="md">
              <Body size="body5" muted className="mb-2">
                VStack (gap=4)
              </Body>
              <VStack>
                <div className="h-6 w-full rounded bg-[var(--color-primary-light)]" />
                <div className="h-6 w-full rounded bg-[var(--color-primary-light)]" />
                <div className="h-6 w-full rounded bg-[var(--color-primary-light)]" />
              </VStack>
            </Card>
            <Card padding="md">
              <Body size="body5" muted className="mb-2">
                HStack (gap=4)
              </Body>
              <HStack>
                <div className="h-6 w-16 rounded bg-[var(--color-primary-light)]" />
                <div className="h-6 w-16 rounded bg-[var(--color-primary-light)]" />
                <div className="h-6 w-16 rounded bg-[var(--color-primary-light)]" />
              </HStack>
            </Card>
          </HStack>
        </SubSection>

        <SubSection title="Grid">
          <Body size="body4" muted className="mb-2">
            Grid cols=4 (gap=4)
          </Body>
          <Grid cols={4}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] flex items-center justify-center"
              >
                <Body size="body5" muted>
                  {i + 1}
                </Body>
              </div>
            ))}
          </Grid>
        </SubSection>
      </Section>
    </Container>
  )
}
