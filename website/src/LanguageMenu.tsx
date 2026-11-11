import { type ReactElement, useId } from 'react';
import { LOCALE_NAMES, SiteLocale, localePath } from './siteLocale';
import { useText } from './text';

/** The languages of the site as plain links in a native popover: crawlers follow them, and the browser opens and dismisses it, before hydration too. */
export function LanguageMenu(): ReactElement {
  const { site, locale } = useText();
  const listId = useId();
  // without its region, the menu is as narrow in every language: a phone's title bar is full
  const { language } = new Intl.Locale(locale);

  return (
    <>
      <button
        type="button"
        className="select lang-menu"
        popoverTarget={listId}
        aria-label={site('language.current', { name: LOCALE_NAMES[locale] })}
      >
        {language}
      </button>
      <ul id={listId} popover="auto" className="lang-list">
        {Object.values(SiteLocale).map((other) => (
          <li key={other}>
            <a
              href={localePath(other)}
              hrefLang={other}
              lang={other}
              aria-current={other === locale ? 'page' : undefined}
            >
              {LOCALE_NAMES[other]}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
