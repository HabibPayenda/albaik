import { useEffect } from 'react'
import { applyDocumentHead } from '@/hooks/useDocumentHead'

/**
 * Keeps the document title in sync for simple surfaces (the dashboard and the route
 * error page). Public pages use `useDocumentHead`, which mirrors the server shell's
 * title, description, canonical and social tags. A title-only surface still clears the
 * managed tags left by the previous route, so no stale canonical or description leaks
 * into the dashboard.
 */
export function useDocumentTitle(title?: string | null, description?: string | null) {
  useEffect(() => {
    if (!title) return
    applyDocumentHead({ title, description: description ?? null })
  }, [title, description])
}
