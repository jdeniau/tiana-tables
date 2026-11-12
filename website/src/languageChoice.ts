import { useSyncExternalStore } from 'react';
import { SiteLocale } from './siteLocale';

const STORAGE_KEY = 'locale';

const listeners = new Set<() => void>();
// where the pick lives when the browser refuses storage
let unstoredPick: string | null = null;

function languageOf(tag: string): string | null {
  try {
    return new Intl.Locale(tag).language;
  } catch {
    return null;
  }
}

/** The language to offer on a page in `pageLocale`: the first of the browser's the site is written in, until the visitor picks one. */
export function offeredLocale(
  languages: ReadonlyArray<string>,
  picked: string | null,
  pageLocale: SiteLocale
): SiteLocale | null {
  const locales = Object.values(SiteLocale);
  if (locales.some((locale) => locale === picked)) {
    return null;
  }
  // region and script aside: a Portuguese reader gets pt-BR, a Taiwanese one zh-CN
  for (const tag of languages) {
    const language = languageOf(tag);
    const locale = locales.find((other) => languageOf(other) === language);
    if (locale) {
      return locale === pageLocale ? null : locale;
    }
  }
  return null;
}

function readPick(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return unstoredPick;
  }
}

/** Remembers the language the visitor chose, so that no page offers another. */
export function pickLocale(locale: SiteLocale): void {
  unstoredPick = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage blocked: the pick lasts until the page is left
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  window.addEventListener('languagechange', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
    window.removeEventListener('languagechange', listener);
  };
}

/** The language to offer a visitor of a page written in `pageLocale`, null once they picked one. */
export function useOfferedLocale(pageLocale: SiteLocale): SiteLocale | null {
  return useSyncExternalStore(
    subscribe,
    () => offeredLocale(navigator.languages, readPick(), pageLocale),
    // the page rendered at build offers nothing: the browser's languages are read once hydrated
    () => null
  );
}
