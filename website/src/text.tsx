import {
  type ReactElement,
  type ReactNode,
  createContext,
  useContext,
} from 'react';
import { IntlMessageFormat } from 'intl-messageformat';
import appEn from '../../locales/en';
import appFr from '../../locales/fr';
import type { Translation } from '../../locales/type';
import siteEn from '../locales/en';
import siteFr from '../locales/fr';
import type { SiteMessages } from '../locales/type';
import { SiteLocale } from './siteLocale';

export type SiteKey = {
  [K in keyof SiteMessages]: SiteMessages[K] extends string ? K : never;
}[keyof SiteMessages];
type SiteListKey = {
  [K in keyof SiteMessages]: SiteMessages[K] extends string[] ? K : never;
}[keyof SiteMessages];
type Values = Record<string, string | number>;

/** The words of a page: the site's own, and the app's for the windows it draws. */
export interface Text {
  readonly locale: SiteLocale;
  /** A message of the site, as plain text */
  site(key: SiteKey, values?: Values): string;
  /** A message of the site with its `<code>` tags, and its `<link>` tag pointing to `href` */
  rich(key: SiteKey, href?: string): ReactNode;
  /** Each item of a list message of the site, as `rich` renders it */
  richList(key: SiteListKey): ReactNode[];
  /** A message of the app, worded as the app shows it */
  app(key: keyof Translation, values?: Values): string;
}

const SITE_MESSAGES: Record<SiteLocale, SiteMessages> = {
  [SiteLocale.En]: siteEn,
  [SiteLocale.Fr]: siteFr,
};
const APP_MESSAGES: Record<SiteLocale, Translation> = {
  [SiteLocale.En]: appEn,
  [SiteLocale.Fr]: appFr,
};

export function createText(locale: SiteLocale): Text {
  const format = (message: string, values?: Values): string =>
    String(new IntlMessageFormat(message, locale).format(values));

  const formatRich = (message: string, href?: string): ReactNode => {
    let key = 0;
    return new IntlMessageFormat(message, locale).format<ReactElement>({
      code: (chunks) => <code key={key++}>{chunks}</code>,
      link: (chunks) => (
        <a key={key++} href={href}>
          {chunks}
        </a>
      ),
    });
  };

  return {
    locale,
    site: (key, values) => format(SITE_MESSAGES[locale][key], values),
    rich: (key, href) => formatRich(SITE_MESSAGES[locale][key], href),
    richList: (key) =>
      SITE_MESSAGES[locale][key].map((item) => formatRich(item)),
    app: (key, values) => format(APP_MESSAGES[locale][key], values),
  };
}

const TextContext = createContext<Text>(createText(SiteLocale.En));

export const TextProvider = TextContext.Provider;

export function useText(): Text {
  return useContext(TextContext);
}
