import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const en = {
  appName: 'Sabzi Mandi',
  tagline: 'Fruit & Sabzi Commission Agent',
  login: 'Login',
  email: 'Email',
  password: 'Password',
  welcome: 'Welcome back',
  language: 'اردو',
}

const ur = {
  appName: 'سبزی منڈی',
  tagline: 'سبزی فروٹ کمیشن ایجنٹ',
  login: 'لاگ اِن',
  email: 'ای میل',
  password: 'پاس ورڈ',
  welcome: 'خوش آمدید',
  language: 'EN',
}

const saved = localStorage.getItem('sabzi_lang') || 'ur'

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
  },
  lng: saved.startsWith('ur') ? 'ur' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function applyDir(lang: string) {
  const code = lang.startsWith('ur') ? 'ur' : 'en'
  document.documentElement.lang = code
  document.documentElement.dir = code === 'ur' ? 'rtl' : 'ltr'
}

export async function setLang(lang: 'en' | 'ur') {
  await i18n.changeLanguage(lang)
  localStorage.setItem('sabzi_lang', lang)
  applyDir(lang)
}

applyDir(saved)
export default i18n
