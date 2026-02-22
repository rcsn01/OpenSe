import { Heading, Body, Label, SubLabel, Code, Container, VStack, HStack } from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

export function TypographyPage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Typography">
        <SubSection title="Headings (h1–h6)">
          <VStack>
            <Heading level="h1">Heading 1 — The quick brown fox</Heading>
            <Heading level="h2">Heading 2 — The quick brown fox</Heading>
            <Heading level="h3">Heading 3 — The quick brown fox</Heading>
            <Heading level="h4">Heading 4 — The quick brown fox</Heading>
            <Heading level="h5">Heading 5 — The quick brown fox</Heading>
            <Heading level="h6">Heading 6 — The quick brown fox</Heading>
          </VStack>
        </SubSection>

        <SubSection title="Body Text (body1–body6)">
          <VStack>
            <Body size="body1">Body 1 — The quick brown fox jumps over the lazy dog. (xl)</Body>
            <Body size="body2">Body 2 — The quick brown fox jumps over the lazy dog. (lg)</Body>
            <Body size="body3">Body 3 — The quick brown fox jumps over the lazy dog. (base)</Body>
            <Body size="body4">Body 4 — The quick brown fox jumps over the lazy dog. (sm)</Body>
            <Body size="body5">Body 5 — The quick brown fox jumps over the lazy dog. (xs)</Body>
            <Body size="body6">Body 6 — The quick brown fox jumps over the lazy dog. (2xs)</Body>
          </VStack>
        </SubSection>

        <SubSection title="Muted Text">
          <VStack>
            <Body size="body2" muted>
              This is muted body2 text for supplementary information.
            </Body>
            <Body size="body4" muted>
              This is muted body4 text for captions and hints.
            </Body>
          </VStack>
        </SubSection>

        <SubSection title="Labels">
          <VStack>
            <HStack>
              <Label>Default Label</Label>
              <Label required>Required Label</Label>
            </HStack>
            <VStack className="gap-0">
              <Label>Email</Label>
              <SubLabel>We'll never share your email with anyone.</SubLabel>
            </VStack>
          </VStack>
        </SubSection>

        <SubSection title="Code">
          <HStack wrap>
            <Body size="body3">
              Inline code: <Code>const x = 42</Code>
            </Body>
          </HStack>
          <Code block>{`function greet(name: string) {\n  return \`Hello, \${name}!\`;\n}`}</Code>
        </SubSection>
      </Section>
    </Container>
  )
}
