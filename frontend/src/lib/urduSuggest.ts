/**
 * Common Mandi English → Urdu names for auto-fill.
 * Matched case-insensitively on full name or individual words.
 */
const DICTIONARY: Record<string, string> = {
  // Vegetables
  potato: 'آلو',
  aloo: 'آلو',
  onion: 'پیاز',
  pyaz: 'پیاز',
  tomato: 'ٹماٹر',
  tamatar: 'ٹماٹر',
  chilli: 'مرچ',
  chili: 'مرچ',
  mirch: 'مرچ',
  garlic: 'لہسن',
  lehsun: 'لہسن',
  ginger: 'ادرک',
  adrakh: 'ادرک',
  carrot: 'گاجر',
  gajar: 'گاجر',
  radish: 'مولی',
  mooli: 'مولی',
  cucumber: 'کھیرا',
  kheera: 'کھیرا',
  cabbage: 'بند گوبھی',
  cauliflower: 'گوبھی',
  gobhi: 'گوبھی',
  spinach: 'پالک',
  palak: 'پالک',
  peas: 'مٹر',
  matar: 'مٹر',
  ladyfinger: 'بھنڈی',
  okra: 'بھنڈی',
  bhindi: 'بھنڈی',
  brinjal: 'بینگن',
  eggplant: 'بینگن',
  baingan: 'بینگن',
  pumpkin: 'کدو',
  kaddu: 'کدو',
  bottle: 'لوکی',
  lauki: 'لوکی',
  bitter: 'کریلا',
  karela: 'کریلا',
  coriander: 'دھنیا',
  dhania: 'دھنیا',
  mint: 'پودینہ',
  pudina: 'پودینہ',
  lemon: 'لیموں',
  limo: 'لیموں',
  // Fruits
  apple: 'سیب',
  seb: 'سیب',
  banana: 'کیلا',
  kela: 'کیلا',
  mango: 'آم',
  aam: 'آم',
  orange: 'مالٹا',
  malta: 'مالٹا',
  kinnow: 'کنو',
  grapes: 'انگور',
  angoor: 'انگور',
  guava: 'امرود',
  amrood: 'امرود',
  pomegranate: 'انار',
  anar: 'انار',
  watermelon: 'تربوز',
  tarbooz: 'تربوز',
  melon: 'خربوزہ',
  kharbuza: 'خربوزہ',
  peach: 'آڑو',
  aaro: 'آڑو',
  apricot: 'خوبانی',
  dates: 'کھجور',
  khajoor: 'کھجور',
  // Shop / party words
  traders: 'ٹریڈرز',
  trader: 'ٹریڈر',
  store: 'اسٹور',
  shop: 'دکان',
  mandi: 'منڈی',
  sabzi: 'سبزی',
  fruit: 'پھل',
  fruits: 'پھل',
  fresh: 'تازہ',
  farm: 'فارم',
  farmer: 'کسان',
  commission: 'کمیشن',
  agency: 'ایجنسی',
  transport: 'ٹرانسپورٹ',
  labour: 'مزدور',
  // Units / cities (useful in names)
  lahore: 'لاہور',
  karachi: 'کراچی',
  islamabad: 'اسلام آباد',
  faisalabad: 'فیصل آباد',
  rawalpindi: 'راولپنڈی',
  multan: 'ملتان',
  peshawar: 'پشاور',
  quetta: 'کوئٹہ',
}

/** Return Urdu suggestion for an English (or Roman Urdu) name. */
export function suggestUrduName(englishName: string): string {
  const raw = englishName.trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()
  if (DICTIONARY[lower]) return DICTIONARY[lower]

  // Try whole phrase without punctuation
  const compact = lower.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (DICTIONARY[compact]) return DICTIONARY[compact]

  const parts = compact.split(' ').filter(Boolean)
  if (parts.length === 0) return ''

  const translated = parts.map((word) => DICTIONARY[word] || null)
  // Only auto-fill when at least one known Mandi word matched
  if (translated.every((t) => t === null)) return ''

  return translated
    .map((t, i) => t ?? parts[i])
    .join(' ')
    .trim()
}
