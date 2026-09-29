import { useEffect } from 'react'

/** Keeps the document title and meta description in sync with the active route. */
export function useDocumentTitle(title?: string | null, description?: string | null) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])

  useEffect(() => {
    if (!description) return
    let tag = document.querySelector('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', description)
  }, [description])
}
