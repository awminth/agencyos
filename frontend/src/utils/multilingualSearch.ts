// Multilingual Search Utility for Agency Management System
// Supports Myanmar (မြန်မာ), English, and Japanese (日本語) matching,
// script detection, normalization (NFKC, Hiragana/Katakana conversion),
// and cross-lingual concept dictionary expansion.

export type SupportedScript = 'ALL' | 'EN' | 'MM' | 'JP';

/**
 * Normalizes text:
 * - Unicode NFKC (collapses full-width ASCII/numbers and half-width katakana)
 * - Lowercase
 * - Strips zero-width characters (\u200B, \u200C, \u200D, \uFEFF)
 * - Collapses whitespace
 */
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts Hiragana to Katakana (U+3041..U+3096 -> U+30A1..U+30F6).
 */
export function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

/**
 * Converts Katakana to Hiragana (U+30A1..U+30F6 -> U+3041..U+3096).
 */
export function toHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/**
 * Normalizes common Myanmar Unicode sequences & variations:
 * - Removes zero-width spaces/joiners
 * - Standardizes common combining order
 * - Maps basic Zawgyi vowel/diacritic patterns to Unicode
 */
export function normalizeMyanmar(str: string): string {
  if (!str) return '';
  let out = str.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // Basic Zawgyi to Unicode reordering for ေ (U+1031) preceding consonant
  out = out.replace(/\u1031([\u1000-\u1021])/g, '$1\u1031');
  // Reorder asat + anusvara if reversed
  out = out.replace(/\u1036\u103A/g, '\u103A\u1036');

  return out.trim();
}

/**
 * Detects which scripts are present in a given string.
 */
export function detectScripts(str: string): { hasMm: boolean; hasJp: boolean; hasEn: boolean } {
  const hasMm = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/.test(str);
  const hasJp = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str);
  const hasEn = /[A-Za-z]/.test(str);
  return { hasMm, hasJp, hasEn };
}

/**
 * Determines primary script / language badge for display.
 */
export function getPrimaryLanguageTag(str: string): 'MM' | 'JP' | 'EN' | null {
  const { hasMm, hasJp, hasEn } = detectScripts(str);
  if (hasMm) return 'MM';
  if (hasJp) return 'JP';
  if (hasEn) return 'EN';
  return null;
}

interface TermConcept {
  en: string[];
  mm: string[];
  ja: string[];
}

/**
 * Bidirectional cross-lingual dictionary for AgencyMS domain entities:
 * Visa types, job categories, supervising orgs, host companies, schools, cities, etc.
 */
export const CONCEPTS: TermConcept[] = [
  // 1. Caregiver / Nursing
  {
    en: ['caregiver', 'nursing care', 'nursing', 'elderly care', 'elderly', 'elder', 'nurse'],
    mm: ['သူနာပြု', 'ဘိုးဘွားရိပ်သာ', 'သက်ကြီးစောင့်ရှောက်', 'စောင့်ရှောက်ရေး', 'လူနာစောင့်', 'သူနာပြုဆရာမ', 'စောင့်ရှောက်'],
    ja: ['介護', 'かいご', '看護', 'かんご', '高齢者', 'ケア', '老健', '福祉', 'kaigo', 'kango'],
  },
  // 2. Construction / Scaffolding / Building
  {
    en: ['construction', 'scaffolding', 'building works', 'building', 'scaffold', 'civil engineering'],
    mm: ['ဆောက်လုပ်ရေး', 'ငြမ်းဆင်', 'ငြမ်း', 'အဆောက်အအုံ', 'ကန်ထရိုက်', 'ဆောက်လုပ်', 'အင်ဂျင်နီယာ'],
    ja: ['建設', 'けんせつ', '足場', 'あしば', '建築', 'けんちく', '土木', '工事', 'kensetsu', 'ashiba'],
  },
  // 3. Food Processing / Bento / Beverage / Delica
  {
    en: ['food processing', 'food & beverage', 'food', 'beverage', 'bento', 'delica', 'delicatessen'],
    mm: ['အစားအသောက်', 'အစားအစာ', 'စားသောက်ကုန်', 'ထမင်းဘူး', 'မုန့်', 'အစာအဟာရ', 'ထုတ်လုပ်'],
    ja: ['食品', 'しょくひん', '飲食料品', '飲食', '弁当', 'べんとう', 'デリカ', '総菜', 'そうざい', 'shokuhin', 'bento'],
  },
  // 4. Agriculture / Dairy / Farm
  {
    en: ['agriculture', 'dairy farm', 'dairy', 'farm', 'farming', 'livestock', 'crop'],
    mm: ['စိုက်ပျိုးရေး', 'လယ်ယာ', 'မွေးမြူရေး', 'နို့စားနွား', 'စိုက်ပျိုး', 'ခြံ', 'နို့ထွက်ပစ္စည်း'],
    ja: ['農業', 'のうぎょう', '酪農', 'らくのう', '農家', '農場', '畑', '畜産', 'nougyou', 'rakunou'],
  },
  // 5. Machining / Manufacturing / Metal / Auto Parts
  {
    en: ['machining & metal works', 'machining', 'manufacturing', 'metal works', 'auto parts', 'machinery', 'precision', 'machine'],
    mm: ['စက်မှုလက်မှု', 'စက်မှု', 'သတ္တု', 'ကားအစိတ်အပိုင်း', 'စက်ပစ္စည်း', 'တိကျစက်မှု', 'စက်အစိတ်အပိုင်း', 'ထုတ်လုပ်မှု'],
    ja: ['機械', 'きかい', '製造', 'せいぞう', '金属', 'きんぞく', '自動車', '部品', '精密機械', '精密', '加工', 'kikai', 'seizou', 'kinzoku'],
  },
  // 6. Textile / Garment / Apparel
  {
    en: ['textile manufacturing', 'textile', 'garment', 'apparel', 'clothing', 'sewing'],
    mm: ['အထည်အလိပ်', 'အဝတ်အထည်', 'အထည်ချုပ်', 'အပ်ချုပ်', 'ချည်မျှင်'],
    ja: ['繊維', 'せんい', 'アパレル', '縫製', 'ほうせい', '衣服', '服飾', 'seni', 'housei'],
  },
  // 7. Engineering / Humanities / Technical
  {
    en: ['engineering', 'humanities', 'engineer', 'international services', 'technical', 'technology'],
    mm: ['အင်ဂျင်နီယာ', 'လူမှုရေး', 'နိုင်ငံတကာ', 'နည်းပညာ', 'ပညာရပ်'],
    ja: ['技術', 'ぎじゅつ', '人文知識', 'じんぶんちしき', '国際業務', 'こくさいぎょうむ', '技人国', 'ぎじんこく', 'エンジニア', 'gijutsu', 'enjinia'],
  },
  // 8. TITP (Technical Intern Training)
  {
    en: ['titp', 'titp-1', 'titp-2', 'titp-3', 'technical intern', 'intern trainee', 'trainee', 'intern'],
    mm: ['နည်းပညာအလုပ်သင်', 'အလုပ်သင်', 'သင်တန်းသား', 'ဂျပန်အလုပ်သင်'],
    ja: ['技能実習', 'ぎのうじっしゅう', '実習生', 'じっしゅうせい', '実習', 'titp', 'ginou jisshuu'],
  },
  // 9. SSW (Specified Skilled Worker)
  {
    en: ['ssw', 'ssw-caregiver', 'ssw-construction', 'ssw-food processing', 'ssw-agriculture', 'ssw-manufacturing', 'specified skilled', 'skilled worker'],
    mm: ['သတ်မှတ်ကျွမ်းကျင်', 'ကျွမ်းကျင်လုပ်သား', 'ကျွမ်းကျင်', 'ကျွမ်းကျင်မှု'],
    ja: ['特定技能', 'とくていぎのう', '特技', 'ssw', 'tokutei ginou'],
  },
  // 10. Supervising Organization
  {
    en: ['supervising org', 'supervising organization', 'cooperative', 'union', 'association', 'jsc', 'otit'],
    mm: ['ကြီးကြပ်ရေးအဖွဲ့', 'ကြီးကြပ်ရေး', 'သမဝါယမ', 'အသင်း', 'အဖွဲ့'],
    ja: ['監理団体', 'かんりだんたい', '協同組合', 'きょうどうくみあい', '組合', 'くみあい', '協会', 'きょうかい', 'kanri dantai', 'kumiai'],
  },
  // 11. Host Company / Corporation
  {
    en: ['host company', 'company', 'co., ltd.', 'corporation', 'inc.', 'k.k.', 'enterprise'],
    mm: ['လက်ခံကုမ္ပဏီ', 'ကုမ္ပဏီ', 'လုပ်ငန်းခွင်', 'အလုပ်ရှင်', 'ကုမ္ပဏီလီမိတက်'],
    ja: ['受入企業', 'うけいれきぎょう', '受入', '企業', '会社', '株式会社', 'ukeire kigyou', 'kaisha'],
  },
  // 12. School / Language Academy
  {
    en: ['school', 'school name', 'academy', 'college', 'language school', 'study abroad', 'japanese language academy'],
    mm: ['ကျောင်း', 'ကျောင်းအမည်', 'ဘာသာစကားကျောင်း', 'ကောလိပ်', 'ပညာသင်', 'တက္ကသိုလ်', 'ဂျပန်စာကျောင်း'],
    ja: ['学校', 'がっこう', '学校名', '日本語学校', 'にほんごがっこう', 'カレッジ', '学院', 'がくいん', 'gakkou', 'nihongo gakkou'],
  },
  // 13. Visa Category
  {
    en: ['visa', 'visa type', 'residence status'],
    mm: ['ဗီဇာ', 'ဗီဇာအမျိုးအစား', 'နေထိုင်ခွင့်'],
    ja: ['ビザ', 'ビザ種別', '査証', '在留資格', 'ざいりゅうしかく'],
  },
  // 14. Job Category
  {
    en: ['job', 'job category', 'occupation', 'profession', 'work'],
    mm: ['အလုပ်အကိုင်', 'အလုပ်အမျိုးအစား', 'အလုပ်'],
    ja: ['職種', 'しょくしゅ', '仕事', 'しごと', '作業', 'さぎょう'],
  },
  // 15. Logistics Hub / Warehouse
  {
    en: ['logistics', 'hub', 'warehouse', 'transport', 'distribution'],
    mm: ['သယ်ယူပို့ဆောင်ရေး', 'ကုန်စည်', 'ဂိုဒေါင်', 'သယ်ယူပို့ဆောင်'],
    ja: ['物流', 'ぶつりゅう', 'ロジスティクス', '倉庫', 'そうこ', '運輸', 'butsuryuu'],
  },
  // 16. Cities & Prefectures (Japan)
  {
    en: ['tokyo'],
    mm: ['တိုကျို'],
    ja: ['東京', 'とうきょう', 'トウキョウ'],
  },
  {
    en: ['osaka'],
    mm: ['အိုဆာကာ'],
    ja: ['大阪', 'おおさか', 'オオサカ'],
  },
  {
    en: ['nagoya'],
    mm: ['နာဂိုယာ'],
    ja: ['名古屋', 'なごや', 'ナゴヤ'],
  },
  {
    en: ['kyoto'],
    mm: ['ကျိုတို'],
    ja: ['京都', 'きょうと', 'キョウト'],
  },
  {
    en: ['yokohama'],
    mm: ['ယိုကိုဟားမား'],
    ja: ['横浜', 'よこはま', 'ヨコハマ'],
  },
  {
    en: ['hokkaido'],
    mm: ['ဟော့ကိုင်းဒိုး'],
    ja: ['北海道', 'ほっかいどう', 'ホッカイドウ'],
  },
  {
    en: ['saitama'],
    mm: ['ဆာအိတာမား', 'ဆိုင်တာမာ'],
    ja: ['埼玉', 'さいたま', 'サイタマ'],
  },
  {
    en: ['fukuoka'],
    mm: ['ဖူကူအိုကာ', 'ဖူကူအိုခါ'],
    ja: ['福岡', 'ふくおか', 'フクオカ'],
  },
  {
    en: ['kanto'],
    mm: ['ကန်တို'],
    ja: ['関東', 'かんとう', 'カントウ'],
  },
  {
    en: ['chubu'],
    mm: ['ချူးဘူ'],
    ja: ['中部', 'ちゅうぶ', 'チュウブ'],
  },
  {
    en: ['japan'],
    mm: ['ဂျပန်'],
    ja: ['日本', 'にほん', 'にっぽん', 'ジャパン'],
  },
  // 17. Seed Data Specific Entities
  {
    en: ['tanaka'],
    mm: ['တာနာကာ', 'တနက'],
    ja: ['田中', 'たなか', 'タナカ'],
  },
  {
    en: ['yamada'],
    mm: ['ယာမာဒါ', 'ယမဒ'],
    ja: ['山田', 'やまだ', 'ヤマダ'],
  },
  {
    en: ['fuji'],
    mm: ['ဖူဂျီ'],
    ja: ['富士', 'ふじ', 'フジ'],
  },
];

export interface SearchableVariable {
  id: string;
  category: string;
  value: string;
  parentValue?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Checks if a search query matches a system variable item across English, Myanmar, and Japanese.
 */
export function matchesMultilingual(
  query: string,
  item: SearchableVariable,
  selectedLang: SupportedScript = 'ALL'
): boolean {
  const qRaw = query.trim();

  // If a language filter is explicitly chosen, check if item matches language criteria
  if (selectedLang !== 'ALL') {
    const itemScripts = detectScripts(`${item.value} ${item.parentValue || ''}`);
    if (selectedLang === 'MM' && !itemScripts.hasMm) {
      // Allow concept cross-match only if query was provided
      if (!qRaw) return false;
    }
    if (selectedLang === 'JP' && !itemScripts.hasJp) {
      if (!qRaw) return false;
    }
    if (selectedLang === 'EN' && !itemScripts.hasEn) {
      if (!qRaw) return false;
    }
  }

  // If query is blank, it passes (language filter handled above)
  if (!qRaw) return true;

  const qNorm = normalizeText(qRaw);
  const qKana = toKatakana(qNorm);
  const qHira = toHiragana(qNorm);
  const qMm = normalizeMyanmar(qNorm);

  const vNorm = normalizeText(item.value);
  const vKana = toKatakana(vNorm);
  const vMm = normalizeMyanmar(item.value);

  const pNorm = item.parentValue ? normalizeText(item.parentValue) : '';
  const pKana = item.parentValue ? toKatakana(pNorm) : '';
  const pMm = item.parentValue ? normalizeMyanmar(item.parentValue) : '';

  // 1. Direct Substring Match (Case-insensitive, NFKC normalized)
  if (
    vNorm.includes(qNorm) ||
    pNorm.includes(qNorm) ||
    vKana.includes(qKana) ||
    pKana.includes(qKana) ||
    (qHira && vNorm.includes(qHira))
  ) {
    return true;
  }

  // 2. Myanmar Specific Match
  if (qMm && (vMm.includes(qMm) || pMm.includes(qMm))) {
    return true;
  }

  // 3. Category ID Match (e.g. searching 'visa_type' or 'host')
  const catNorm = normalizeText(item.category);
  if (catNorm.includes(qNorm)) {
    return true;
  }

  // 4. Cross-lingual Dictionary / Concept Expansion
  // Find concepts matching the query in ANY language
  const matchingConcepts = CONCEPTS.filter((c) => {
    // Check English synonyms
    if (c.en.some((w) => normalizeText(w).includes(qNorm) || qNorm.includes(normalizeText(w)))) {
      return true;
    }
    // Check Myanmar synonyms
    if (c.mm.some((w) => normalizeMyanmar(w).includes(qMm) || qMm.includes(normalizeMyanmar(w)))) {
      return true;
    }
    // Check Japanese synonyms (Kanji, Hiragana, Katakana, Romaji)
    if (
      c.ja.some((w) => {
        const wNorm = normalizeText(w);
        const wKana = toKatakana(wNorm);
        return (
          wNorm.includes(qNorm) ||
          qNorm.includes(wNorm) ||
          wKana.includes(qKana) ||
          qKana.includes(wKana)
        );
      })
    ) {
      return true;
    }
    return false;
  });

  if (matchingConcepts.length > 0) {
    // Check if the item's value or parent matches ANY synonym in the matching concepts
    for (const c of matchingConcepts) {
      const allSynonyms = [...c.en, ...c.mm, ...c.ja];
      for (const syn of allSynonyms) {
        const synNorm = normalizeText(syn);
        const synKana = toKatakana(synNorm);
        const synMm = normalizeMyanmar(syn);

        if (
          vNorm.includes(synNorm) ||
          pNorm.includes(synNorm) ||
          vKana.includes(synKana) ||
          pKana.includes(synKana) ||
          (synMm && (vMm.includes(synMm) || pMm.includes(synMm)))
        ) {
          return true;
        }
      }
    }
  }

  return false;
}
