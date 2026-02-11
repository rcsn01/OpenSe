import {
  Button,
  Alert,
  Progress,
  Spinner,
  DotPulse,
  Skeleton,
  Body,
  Container,
  VStack,
  HStack,
} from '../components/ui'
import { useToast } from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

function ToastDemo() {
  const { toast } = useToast()
  return (
    <HStack gap={2} wrap>
      <Button
        size="sm"
        variant="outline"
        onClick={() => toast({ title: 'Default toast', variant: 'default' })}
      >
        Default
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({ title: 'Success!', description: 'File saved.', variant: 'success' })
        }
      >
        Success
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({ title: 'Warning', description: 'Disk almost full.', variant: 'warning' })
        }
      >
        Warning
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast({ title: 'Error', description: 'Failed to connect.', variant: 'destructive' })
        }
      >
        Error
      </Button>
    </HStack>
  )
}

export function AlertsPage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Alerts & Feedback">
        <SubSection title="Alert Variants">
          <VStack gap={3}>
            <Alert variant="info" title="Information">
              This is an informational alert message.
            </Alert>
            <Alert variant="success" title="Success">
              Operation completed successfully!
            </Alert>
            <Alert variant="warning" title="Warning">
              Please review before proceeding.
            </Alert>
            <Alert variant="destructive" title="Error" dismissible>
              Something went wrong. Please try again.
            </Alert>
          </VStack>
        </SubSection>

        <SubSection title="Progress Bar">
          <VStack gap={3}>
            <Progress value={25} />
            <Progress value={50} variant="success" showLabel />
            <Progress value={75} variant="warning" size="lg" showLabel />
            <Progress value={90} variant="destructive" size="sm" />
          </VStack>
        </SubSection>

        <SubSection title="Spinners & Loaders">
          <HStack gap={6} align="center">
            <VStack gap={1} align="center">
              <Spinner size="sm" />
              <Body size="body5" muted>
                Small
              </Body>
            </VStack>
            <VStack gap={1} align="center">
              <Spinner size="md" />
              <Body size="body5" muted>
                Medium
              </Body>
            </VStack>
            <VStack gap={1} align="center">
              <Spinner size="lg" />
              <Body size="body5" muted>
                Large
              </Body>
            </VStack>
            <VStack gap={1} align="center">
              <DotPulse />
              <Body size="body5" muted>
                Dot Pulse
              </Body>
            </VStack>
          </HStack>
        </SubSection>

        <SubSection title="Skeleton Loaders">
          <VStack gap={2}>
            <Skeleton width="100%" height={16} />
            <Skeleton width="80%" height={16} />
            <HStack gap={3}>
              <Skeleton width={40} height={40} rounded />
              <VStack gap={2}>
                <Skeleton width={200} height={14} />
                <Skeleton width={140} height={12} />
              </VStack>
            </HStack>
          </VStack>
        </SubSection>

        <SubSection title="Toast Notifications">
          <ToastDemo />
        </SubSection>
      </Section>
    </Container>
  )
}
