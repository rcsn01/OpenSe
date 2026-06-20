import { useMemo } from 'react'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Bold, Heading2, Image as ImageIcon, Italic, Link as LinkIcon, List, ListChecks } from 'lucide-react'
import { Button, cn } from '@repo/ui'
import type { EditorDocument } from '../../types'

export type RichTextEditorValue = {
  json: EditorDocument
  html: string
  text: string
}

export type RichTextEditorProps = {
  value?: EditorDocument | null
  placeholder?: string
  readOnly?: boolean
  onChange?: (value: RichTextEditorValue) => void
}

const emptyDocument: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

const toTiptapContent = (value: EditorDocument | null | undefined): JSONContent =>
  (value ?? emptyDocument) as JSONContent

export const RichTextEditor = ({
  value,
  placeholder = 'Write a description...',
  readOnly = false,
  onChange,
}: RichTextEditorProps) => {
  const extensions = useMemo(
    () => [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: readOnly,
        autolink: true,
        linkOnPaste: true,
      }),
      Image.configure({ allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    [placeholder, readOnly],
  )

  const editor = useEditor({
    extensions,
    content: toTiptapContent(value),
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.({
        json: currentEditor.getJSON() as EditorDocument,
        html: currentEditor.getHTML(),
        text: currentEditor.getText(),
      })
    },
  })

  const addLink = () => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previousUrl ?? '')
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const addImage = () => {
    if (!editor) return
    const url = window.prompt('Image URL')
    if (!url?.trim()) return
    editor.chain().focus().setImage({ src: url.trim() }).run()
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-2">
          <Button type="button" variant="ghost" size="icon" aria-label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Heading" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Task list" onClick={() => editor?.chain().focus().toggleTaskList().run()}>
            <ListChecks className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Link" onClick={addLink}>
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Image" onClick={addImage}>
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <EditorContent
        editor={editor}
        className={cn(
          'open-kb-editor min-h-40 px-4 py-3 text-sm leading-6 outline-none',
          readOnly && 'min-h-0',
        )}
      />
    </div>
  )
}
