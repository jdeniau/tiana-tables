import type { ReactElement } from 'react';
import { pickLocale, useOfferedLocale } from './languageChoice';
import { LOCALE_NAMES, localePath } from './siteLocale';
import { createText, useText } from './text';

/** A bar offering the visitor's own language, in that language, until they pick one. */
export function LanguageOffer(): ReactElement | null {
  const { locale } = useText();
  const offered = useOfferedLocale(locale);

  if (!offered) {
    return null;
  }

  return (
    <aside className="lang-offer" lang={offered}>
      <div className="lang-offer-in">
        <span className="lang-offer-text">
          {createText(offered).site('language.offer')}
        </span>
        <span className="lang-offer-actions">
          <a
            className="action small"
            href={localePath(offered)}
            hrefLang={offered}
            onClick={() => pickLocale(offered)}
          >
            {LOCALE_NAMES[offered]}
          </a>
          <button
            type="button"
            className="lang-offer-stay"
            lang={locale}
            onClick={() => pickLocale(locale)}
          >
            {LOCALE_NAMES[locale]} <span aria-hidden="true">×</span>
          </button>
        </span>
      </div>
    </aside>
  );
}
