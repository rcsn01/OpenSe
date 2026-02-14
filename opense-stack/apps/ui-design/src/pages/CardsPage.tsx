import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Body,
  Progress,
  Container,
  Grid,
} from '../components/ui'
import { Section } from '../components/shared/PageSection'

export function CardsPage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Cards">
        <Grid cols={3}>
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>A simple card with header, content, and footer.</CardDescription>
            </CardHeader>
            <CardContent>
              <Body size="body4">Card content goes here. You can put anything inside.</Body>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
              <Button size="sm" variant="ghost">
                Cancel
              </Button>
            </CardFooter>
          </Card>

          <Card hoverable>
            <CardHeader>
              <CardTitle>Hoverable Card</CardTitle>
              <CardDescription>This card has a hover shadow effect.</CardDescription>
            </CardHeader>
            <CardContent>
              <Body size="body4" muted>
                Hover over me to see the shadow transition.
              </Body>
            </CardContent>
          </Card>

          <Card padding="lg">
            <CardHeader>
              <CardTitle>Large Padding</CardTitle>
              <CardDescription>More breathing room inside.</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={65} showLabel />
            </CardContent>
          </Card>
        </Grid>
      </Section>
    </Container>
  )
}
