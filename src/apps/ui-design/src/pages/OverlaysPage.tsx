import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Textarea,
  Checkbox,
  SideSheet,
  SideSheetContent,
  SideSheetHeader,
  SideSheetTitle,
  SideSheetDescription,
  SideSheetBody,
  SideSheetFooter,
  useDialog,
  Container,
} from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

export function OverlaysPage() {
  const dialog = useDialog()
  const sideSheet = useDialog()
  const [sendUpdates, setSendUpdates] = useState(true)

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

        <SubSection title="Side Sheet / Right Popout">
          <Button onClick={sideSheet.onOpen}>Open Side Sheet</Button>
          <SideSheet open={sideSheet.open} onClose={sideSheet.onClose}>
            <SideSheetContent>
              <SideSheetHeader>
                <SideSheetTitle>Edit Workspace Details</SideSheetTitle>
                <SideSheetDescription>
                  Use a side sheet for page-like editing flows, richer forms, and detail views.
                </SideSheetDescription>
              </SideSheetHeader>

              <SideSheetBody className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Workspace name</span>
                    <Input defaultValue="Operations Hub" />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Owner</span>
                    <Input defaultValue="inventory@opense.app" />
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Description</span>
                  <Textarea
                    defaultValue="Shared inventory workspace for purchasing, stock counts, and supplier collaboration."
                  />
                </label>

                <label className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
                  <Checkbox checked={sendUpdates} onChange={(event) => setSendUpdates(event.target.checked)} />
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Send change updates</div>
                    <div className="text-sm text-[var(--color-muted-foreground)]">
                      Notify workspace members when settings in this panel are saved.
                    </div>
                  </div>
                </label>
              </SideSheetBody>

              <SideSheetFooter>
                <Button variant="outline" onClick={sideSheet.onClose}>
                  Cancel
                </Button>
                <Button onClick={sideSheet.onClose}>Save Changes</Button>
              </SideSheetFooter>
            </SideSheetContent>
          </SideSheet>
        </SubSection>
      </Section>
    </Container>
  )
}
