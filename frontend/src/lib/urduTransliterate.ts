import { fromRoman } from 'urdu-tools'

const HAS_LATIN = /[A-Za-z]/

/**
 * Exact Roman → Urdu for common Mandi / Pakistani names & words.
 * `urdu-tools` is phonetic and often wrong for names (asif→اسف, aslam→اسلام).
 */
const WORD_MAP: Record<string, string> = {
  // —— Names (user / shop) ——
  laher: 'لہر',
  lahaar: 'لہر',
  lahera: 'لہر',
  lehra: 'لہر',
  lehar: 'لہر',
  asif: 'آصف',
  aasif: 'آصف',
  aseef: 'آصف',
  aslam: 'اسلم',
  ahmad: 'احمد',
  ahmed: 'احمد',
  muhammad: 'محمد',
  mohammad: 'محمد',
  mohammed: 'محمد',
  ali: 'علی',
  hassan: 'حسن',
  hasan: 'حسن',
  hussain: 'حسین',
  husain: 'حسین',
  hussein: 'حسین',
  bilal: 'بلال',
  usman: 'عثمان',
  othman: 'عثمان',
  imran: 'عمران',
  kamran: 'کامران',
  farhan: 'فرحان',
  irfan: 'عرفان',
  rizwan: 'رضوان',
  salman: 'سلمان',
  rehman: 'رحمان',
  rahman: 'رحمان',
  abdul: 'عبدال',
  abdur: 'عبدالر',
  khan: 'خان',
  malik: 'مالک',
  shah: 'شاہ',
  haji: 'حاجی',
  hajji: 'حاجی',
  chacha: 'چاچا',
  baba: 'بابا',
  bhai: 'بھائی',
  sahib: 'صاحب',
  saheb: 'صاحب',
  master: 'ماسٹر',
  munshi: 'منشی',
  shifa: 'شفاء',
  shefa: 'شفاء',

  // —— Vegetables / goods ——
  alo: 'آلو',
  aloo: 'آلو',
  potato: 'آلو',
  pyaz: 'پیاز',
  pyaaz: 'پیاز',
  onion: 'پیاز',
  tamatar: 'ٹماٹر',
  tomato: 'ٹماٹر',
  gajar: 'گاجر',
  carrot: 'گاجر',
  mooli: 'مولی',
  band: 'بند',
  gobhi: 'گوبھی',
  gobi: 'گوبھی',
  mattar: 'مٹر',
  matar: 'مٹر',
  bhindi: 'بھنڈی',
  kheera: 'کھیرا',
  khira: 'کھیرا',
  tori: 'توری',
  kaddu: 'کدو',
  baingan: 'بینگن',
  brinjal: 'بینگن',
  mirch: 'مرچ',
  mirchi: 'مرچ',
  adrak: 'ادرک',
  lehsan: 'لہسن',
  dhania: 'دھنیا',
  pudina: 'پودینہ',
  palak: 'پالک',
  methi: 'میتھی',
  fruit: 'فروٹ',
  sabzi: 'سبزی',
  maal: 'مال',

  // —— Mandi terms ——
  marfat: 'معرفت',
  maarfat: 'معرفت',
  marka: 'مارکہ',
  commission: 'کمیشن',
  kamishan: 'کمیشن',
  kiraya: 'کرایہ',
  fare: 'کرایہ',
  mazdoori: 'مزدوری',
  labor: 'مزدوری',
  labour: 'مزدوری',
  munshiana: 'منشیانہ',
  market: 'مارکیٹ',
  store: 'اسٹور',
  godown: 'گودام',
  bill: 'بل',
  cash: 'کیش',
  udhaar: 'ادھار',
  udhar: 'ادھار',
  jama: 'جمع',
  banam: 'بنام',
  zamindar: 'زمیندار',
  beopari: 'بیوپاری',
  byapari: 'بیوپاری',
  trader: 'بیوپاری',
  customer: 'گاہک',
  gahak: 'گاہک',
  supplier: 'سپلائر',
  party: 'پارٹی',
  all: 'تمام',
  tamam: 'تمام',
}

function stripMarks(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

function fromRomanSafe(word: string): string {
  try {
    let out = stripMarks(fromRoman(word.toLowerCase()))
    out = out.replace(/[A-Za-z]+/g, (chunk) => {
      try {
        return stripMarks(fromRoman(chunk.toLowerCase()))
      } catch {
        return chunk
      }
    })
    return out.replace(/[A-Za-z]/g, '')
  } catch {
    return word
  }
}

/** Offline phonetic — English word → Urdu (as-you-type) */
export function offlineUrdu(word: string): string {
  if (!word.trim()) return word
  const key = word.toLowerCase()
  if (WORD_MAP[key]) return WORD_MAP[key]
  return fromRomanSafe(word) || word
}

/**
 * Live convert: any English letters in the string become Urdu immediately.
 * Already-Urdu text is left as-is. Multi-word uses per-word map.
 */
export function liveConvertToUrdu(text: string): string {
  if (!HAS_LATIN.test(text)) return text
  return text.replace(/[A-Za-z]+(?:'[A-Za-z]+)*/g, (word) => offlineUrdu(word) || word)
}

/** Google top suggestion (optional refine) — Vite proxy `/inputtools` */
export async function fetchTopUrdu(word: string): Promise<string | null> {
  const q = word.trim()
  if (!q || !HAS_LATIN.test(q)) return null
  try {
    const url =
      `/inputtools/request?text=${encodeURIComponent(q)}` +
      `&itc=ur-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as unknown
    if (
      Array.isArray(data) &&
      data[0] === 'SUCCESS' &&
      Array.isArray(data[1]) &&
      Array.isArray(data[1][0]) &&
      Array.isArray(data[1][0][1]) &&
      data[1][0][1][0]
    ) {
      return String(data[1][0][1][0])
    }
  } catch {
    /* offline */
  }
  return null
}

export function hasLatin(text: string) {
  return HAS_LATIN.test(text)
}
