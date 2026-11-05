import { useSyncExternalStore } from 'react'

/**
 * Whether the browser thinks it is online.
 *
 * `navigator.onLine` is not a promise about the API — it only means the device has a
 * network interface — so this drives copy that says "you are offline", never copy that
 * claims a request succeeded. It is read through `useSyncExternalStore` so every
 * subscriber sees the same value and updates on the same events.
 */
function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

const getSnapshot = () => navigator.onLine
const getServerSnapshot = () => true

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
