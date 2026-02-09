'use client'

import { useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { marked } from 'marked'
import createDOMPurify from 'dompurify'
import { common, createLowlight } from 'lowlight'

interface MarkdownMessageContentProps {
  content: string
}

const SANITIZE_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'a'
]

const SANITIZE_ALLOWED_ATTR = ['href', 'target', 'rel']
const lowlight = createLowlight(common)

const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined') {
    return html
  }

  const purifier = createDOMPurify(window)
  return purifier.sanitize(html, {
    ALLOWED_TAGS: SANITIZE_ALLOWED_TAGS,
    ALLOWED_ATTR: [...SANITIZE_ALLOWED_ATTR, 'class']
  })
}

const markdownToSafeHtml = (markdown: string): string => {
  const renderer = new marked.Renderer()
  renderer.html = () => ''

  marked.setOptions({
    gfm: true,
    breaks: true,
    renderer
  })

  const html = marked.parse(markdown || '')
  return sanitizeHtml(String(html))
}

export const MarkdownMessageContent = ({
  content
}: MarkdownMessageContentProps) => {
  const safeHtml = useMemo(() => markdownToSafeHtml(content), [content])

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        }
      }),
      CodeBlockLowlight.configure({
        lowlight
      }),
      Link.configure({
        openOnClick: true,
        autolink: false,
        linkOnPaste: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank'
        }
      })
    ],
    content: '',
    editorProps: {
      attributes: {
        class:
          'tiptap-markdown leading-relaxed whitespace-normal [&_p]:my-1 [&_h1]:my-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-[0.95rem] [&_h2]:font-semibold [&_h3]:my-1 [&_h3]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:relative [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-zinc-700 [&_pre]:bg-zinc-800 [&_pre]:p-3 [&_pre]:text-zinc-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_a]:text-blue-700 [&_a]:underline dark:[&_a]:text-blue-300 [&_blockquote]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3'
      }
    }
  })

  useEffect(() => {
    if (!editor) return
    editor.commands.setContent(safeHtml)
  }, [editor, safeHtml])

  if (!editor) {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
  }

  return <EditorContent editor={editor} />
}
