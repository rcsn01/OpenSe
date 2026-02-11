import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  useDialog,
  Container,
} from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

export function OverlaysPage() {
  const dialog = useDialog()

  return (
    <Container size="lg" className="py-8">
      <Section title="Overlays">
        <SubSection title="Dialog / Modal">
          <Button onClick={dialog.onOpen}>Open Dialog</Button>
          <Dialog open={dialog.open} onClose={dialog.onClose}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogDescription>
                  Are you sure you want to proceed? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={dialog.onClose}>
                  Cancel
                </Button>
                <Button onClick={dialog.onClose}>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SubSection>
      </Section>
    </Container>
  )
}
