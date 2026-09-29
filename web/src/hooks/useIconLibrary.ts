import { useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { ICON_REGISTRY, type IconEntry } from '@/icons/registry'

export interface IconLibrary {
  /** Every icon in the registry, in category order. */
  all: IconEntry[]
  /** Only the icons an editor has left switched on — what the selectors offer. */
  enabled: IconEntry[]
  disabledSet: Set<string>
}

/**
 * The registry filtered by what the dashboard has switched off.
 *
 * A failed load leaves `disabled` empty on purpose (see `iconsSlice`), so a network
 * problem degrades to "everything is selectable" rather than "nothing is".
 */
export function useIconLibrary(): IconLibrary {
  const disabled = useAppSelector((state) => state.icons.disabled)

  const disabledSet = useMemo(() => new Set(disabled), [disabled])
  const enabled = useMemo(
    () => ICON_REGISTRY.filter((entry) => !disabledSet.has(entry.name)),
    [disabledSet],
  )

  return { all: ICON_REGISTRY, enabled, disabledSet }
}
