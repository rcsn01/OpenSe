import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@repo/ui'
import type { ExtensionUiRequest } from '../lib/assistantBridge'

type ExtensionRequestDialogProps = {
  request: ExtensionUiRequest | null
  onRespond: (response: unknown) => void
  onCancel: () => void
}

type NonSelectExtensionUiRequest = Exclude<ExtensionUiRequest, { type: 'select' }>

const ExtensionRequestDialogContent = ({
  request,
  onRespond,
  onCancel,
}: {
  request: NonSelectExtensionUiRequest
  onRespond: (response: unknown) => void
  onCancel: () => void
}) => {
  const [value, setValue] = useState('value' in request ? request.value ?? '' : '')
  const title = request.title ?? 'Assistant request'
  const message = request.message ?? 'Pi needs a response before it can continue.'

  return (
    <Dialog open={Boolean(request)} onClose={onCancel}>
      <DialogContent className="rounded-[var(--radius-lg)]">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        {request.type === 'confirm' ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
            Confirm this action to continue.
          </div>
        ) : null}

        {request.type === 'input' ? (
          <Input
            aria-label={title}
            value={value}
            placeholder={request.placeholder}
            onChange={(event) => setValue(event.target.value)}
          />
        ) : null}

        {request.type === 'editor' ? (
          <Textarea
            aria-label={title}
            value={value}
            placeholder={request.placeholder}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-48 font-mono text-xs"
          />
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          {request.type === 'confirm' ? (
            <Button type="button" size="sm" onClick={() => onRespond({ id: request.id, confirmed: true })}>
              Confirm
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => onRespond({ id: request.id, value })}
            >
              Submit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const ExtensionRequestDialog = ({
  request,
  onRespond,
  onCancel,
}: ExtensionRequestDialogProps) => {
  if (!request || request.type === 'select') return null

  return (
    <ExtensionRequestDialogContent
      key={request.id}
      request={request}
      onRespond={onRespond}
      onCancel={onCancel}
    />
  )
}
