import React from 'react';
import { normalizeText, toKatakana, toHiragana, normalizeMyanmar, CONCEPTS } from '../utils/multilingualSearch';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

/**
 * Escapes characters for use in RegExp.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights matches in text based on direct match, kana conversion,
 * or multilingual concept synonyms.
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  className = '',
}) => {
  const qTrim = query.trim();
  if (!text || !qTrim) {
    return <span className={className}>{text}</span>;
  }

  const searchTerms = new Set<string>();
  const qNorm = normalizeText(qTrim);
  if (qNorm) searchTerms.add(qNorm);

  const qKana = toKatakana(qNorm);
  if (qKana) searchTerms.add(qKana);

  const qHira = toHiragana(qNorm);
  if (qHira) searchTerms.add(qHira);

  const qMm = normalizeMyanmar(qNorm);
  if (qMm) searchTerms.add(qMm);

  // Expand with synonyms from matching concepts
  for (const c of CONCEPTS) {
    const conceptMatches =
      c.en.some((w) => normalizeText(w).includes(qNorm) || qNorm.includes(normalizeText(w))) ||
      c.mm.some((w) => normalizeMyanmar(w).includes(qMm) || qMm.includes(normalizeMyanmar(w))) ||
      c.ja.some((w) => {
        const wNorm = normalizeText(w);
        return wNorm.includes(qNorm) || qNorm.includes(wNorm);
      });

    if (conceptMatches) {
      // Add english synonyms that might directly appear in text
      for (const w of [...c.en, ...c.ja, ...c.mm]) {
        const wNorm = normalizeText(w);
        if (wNorm.length >= 2) searchTerms.add(wNorm);
      }
    }
  }

  // Filter out single character Latin terms to prevent spurious highlights
  const termsList = Array.from(searchTerms)
    .filter((t) => t.length > 1 || /[\u1000-\u109F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(t))
    .sort((a, b) => b.length - a.length);

  if (termsList.length === 0) {
    return <span className={className}>{text}</span>;
  }

  try {
    const pattern = new RegExp(`(${termsList.map(escapeRegExp).join('|')})`, 'gi');
    const parts = text.split(pattern);

    return (
      <span className={className}>
        {parts.map((part, i) => {
          const isMatch = termsList.some(
            (t) => normalizeText(t) === normalizeText(part)
          );
          if (isMatch) {
            return (
              <mark
                key={i}
                className="rounded bg-amber-100 px-0.5 font-semibold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
              >
                {part}
              </mark>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
};
