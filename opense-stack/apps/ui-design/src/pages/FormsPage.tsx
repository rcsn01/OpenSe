import { useState } from 'react'
import {
  Body,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Toggle,
  Label,
  Container,
  VStack,
  HStack,
  Grid,
} from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

export function FormsPage() {
  const [toggleOn, setToggleOn] = useState(false)

  return (
    <Container size="lg" className="py-8">
      <Section title="Form Controls">
        <SubSection title="Input">
          <Grid cols={2} gap={4}>
            <VStack gap={1}>
              <Label htmlFor="default-input">Default Input</Label>
              <Input id="default-input" placeholder="Enter text..." />
            </VStack>
            <VStack gap={1}>
              <Label htmlFor="error-input">Input with Error</Label>
              <Input id="error-input" placeholder="Invalid value" error="This field is required" />
            </VStack>
            <VStack gap={1}>
              <Label htmlFor="disabled-input">Disabled Input</Label>
              <Input id="disabled-input" placeholder="Cannot edit" disabled />
            </VStack>
          </Grid>
        </SubSection>

        <SubSection title="Textarea">
          <Grid cols={2} gap={4}>
            <VStack gap={1}>
              <Label htmlFor="textarea">Default Textarea</Label>
              <Textarea id="textarea" placeholder="Write something..." />
            </VStack>
            <VStack gap={1}>
              <Label htmlFor="textarea-err">Textarea with Error</Label>
              <Textarea id="textarea-err" placeholder="Description" error="Min. 20 characters needed" />
            </VStack>
          </Grid>
        </SubSection>

        <SubSection title="Select">
          <Grid cols={2} gap={4}>
            <VStack gap={1}>
              <Label>Default Select</Label>
              <Select
                placeholder="Choose an option"
                options={[
                  { value: 'react', label: 'React' },
                  { value: 'vue', label: 'Vue' },
                  { value: 'svelte', label: 'Svelte' },
                ]}
              />
            </VStack>
            <VStack gap={1}>
              <Label>Select with Error</Label>
              <Select
                placeholder="Select..."
                options={[{ value: '1', label: 'Option 1' }]}
                error="Please select an option"
              />
            </VStack>
          </Grid>
        </SubSection>

        <SubSection title="Checkbox, Radio, Toggle">
          <HStack gap={6} wrap>
            <VStack gap={2}>
              <Body size="body5" muted>
                Checkbox
              </Body>
              <Checkbox label="Accept terms" />
              <Checkbox label="Subscribe to newsletter" defaultChecked />
              <Checkbox label="Disabled" disabled />
            </VStack>
            <VStack gap={2}>
              <Body size="body5" muted>
                Radio
              </Body>
              <Radio name="plan" label="Free" defaultChecked />
              <Radio name="plan" label="Pro" />
              <Radio name="plan" label="Enterprise" disabled />
            </VStack>
            <VStack gap={2}>
              <Body size="body5" muted>
                Toggle Switch
              </Body>
              <Toggle label="Dark mode" checked={toggleOn} onChange={() => setToggleOn(!toggleOn)} />
              <Toggle label="Disabled" disabled checked={false} onChange={() => {}} />
            </VStack>
          </HStack>
        </SubSection>
      </Section>
    </Container>
  )
}
