import { type ReactElement, useEffect, useRef } from 'react';
import { LOCALE_NAMES, SiteLocale, localePath } from './siteLocale';
import { useText } from './text';

/** The languages of the site as plain links in a disclosure: crawlers follow them, and they work before hydration. */
export function LanguageMenu(): ReactElement {
  const { site, locale } = useText();
  const menu = useRef<HTMLDetailsElement>(null);
  // without its region, the menu is as narrow in every language: a phone's title bar is full
  const { language } = new Intl.Locale(locale);

  // a disclosure stays open until its summary is toggled: close it as a menu closes
  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      const details = menu.current;
      if (
        details?.open &&
        event.target instanceof Node &&
        !details.contains(event.target)
      ) {
        details.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      const details = menu.current;
      if (details?.open && event.key === 'Escape') {
        details.open = false;
        details.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details ref={menu} className="lang-menu">
      <summary
        className="select"
        aria-label={site('language.current', { name: LOCALE_NAMES[locale] })}
      >
        {language}
      </summary>
      <ul className="lang-list">
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
    </details>
  );
}
