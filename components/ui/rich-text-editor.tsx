'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, List, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  className?: string
}

function ToolbarBtn({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => {
        e.preventDefault() // prevent editor blur
        onClick()
      }}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  // Track whether the last content change came from the user typing (not from a prop update)
  const isInternalUpdate = useRef(false)
  const [, forceRender] = useState(0)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
      }),
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true
      onChange(editor.getHTML())
      forceRender(n => n + 1)
    },
    onSelectionUpdate: () => forceRender(n => n + 1),
    onTransaction: () => forceRender(n => n + 1),
    editorProps: {
      attributes: {
        class: 'rich-text-content min-h-[160px] px-4 py-3 text-sm text-foreground focus:outline-none',
      },
    },
  })

  // Sync external value changes (e.g. loading saved data) without re-creating the editor
  useEffect(() => {
    if (!editor) return
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, false)
    }
  }, [editor, value])

  if (!editor) return null

  return (
    <div className={cn('border border-border rounded-md overflow-hidden bg-background', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/50">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarBtn>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
