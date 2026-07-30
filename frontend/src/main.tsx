import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Toaster } from 'sonner'
import { store } from '@/store'
import { LocaleProvider } from '@/components/shared/LocaleProvider'
import '@/i18n'
import '@/store/api/authApi'
import '@/store/api/businessApi'
import '@/store/api/partiesApi'
import '@/store/api/productsApi'
import '@/store/api/unitsApi'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <LocaleProvider>
        <App />
        <Toaster richColors position="top-center" />
      </LocaleProvider>
    </Provider>
  </StrictMode>
)
