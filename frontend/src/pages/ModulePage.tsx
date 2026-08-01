import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'

/** Placeholder module page until full CRUD is restored. */
export function ModulePage({ titleUr, titleEn }: { titleUr: string; titleEn: string }) {
  const lang = (localStorage.getItem('sabzi_lang') || 'ur').startsWith('ur') ? 'ur' : 'en'
  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-xl border border-white/30 bg-white/90 p-6 shadow">
      <div className="mb-4 inline-flex rounded-xl bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] p-2">
        <MandiHomeLink lang={lang} />
      </div>
      <h1 className={`text-2xl font-bold text-mandi-deep ${lang === 'ur' ? 'font-urdu' : ''}`}>
        {lang === 'ur' ? titleUr : titleEn}
      </h1>
      <p className={`mt-2 text-slate-600 ${lang === 'ur' ? 'font-urdu' : ''}`}>
        {lang === 'ur'
          ? 'یہ ماڈیول جلد مکمل ہوگا۔ ہوم سے شارٹ کٹس استعمال کریں۔'
          : 'This module will be completed next. Use home shortcuts for now.'}
      </p>
    </div>
  )
}
