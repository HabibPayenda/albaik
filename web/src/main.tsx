import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { I18nProvider } from '@/i18n'

// Self-hosted fonts — no Google Fonts request, so the site works fully offline
// and inside the PWA's precache.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/noto-serif/400.css'
import '@fontsource/noto-serif/500.css'
import '@fontsource/noto-serif/600.css'
import '@fontsource/noto-serif/700.css'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <Provider store={store}>
        <App />
      </Provider>
    </I18nProvider>
  </StrictMode>,
)
