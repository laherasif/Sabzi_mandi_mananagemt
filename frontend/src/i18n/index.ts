import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import ur from './ur.json'

const saved = localStorage.getItem('sabzi_lang') || 'ur'

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
  },
  lng: saved.startsWith('ur') ? 'ur' : 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'ur'],
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
})

/** Normalize i18n language to `en` | `ur`. */
export function resolveLang(lang?: string): 'en' | 'ur' {
  const value = (lang || i18n.resolvedLanguage || i18n.language || 'ur').toLowerCase()
  return value.startsWith('ur') ? 'ur' : 'en'
}

export function applyDocumentDirection(lang?: string) {
  const code = resolveLang(lang)
  const dir = code === 'ur' ? 'rtl' : 'ltr'
  document.documentElement.lang = code
  document.documentElement.dir = dir
  document.body.dir = dir
  document.body.classList.toggle('font-urdu', code === 'ur')
  document.body.classList.toggle('font-sans-ui', code === 'en')
}

export async function setAppLanguage(lang: 'en' | 'ur') {
  await i18n.changeLanguage(lang)
  localStorage.setItem('sabzi_lang', lang)
  applyDocumentDirection(lang)
}

i18n.on('languageChanged', (lng) => {
  applyDocumentDirection(lng)
})

applyDocumentDirection(saved)

export default i18n
