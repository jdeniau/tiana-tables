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
import type { AppLocale } from '../../src/configuration/locale';
import siteDe from '../locales/de';
import siteEn from '../locales/en';
import siteEs from '../locales/es';
import siteFr from '../locales/fr';
import siteJa from '../locales/ja';
import sitePtBr from '../locales/pt-BR';
import type { SiteMessages } from '../locales/type';
import siteZhCn from '../locales/zh-CN';
import { SiteLocale } from './siteLocale';

export type SiteKey = {
  [K in keyof SiteMessages]: SiteMessages[K] extends string ? K : never;
}[keyof SiteMessages];
type SiteListKey = {
  [K in keyof SiteMessages]: SiteMessages[K] extends Array<string> ? K : never;
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
  richList(key: SiteListKey): Array<ReactNode>;
  /** A message of the app, worded as the app shows it to a visitor of this page */
  app(key: keyof Translation, values?: Values): string;
}

const SITE_MESSAGES: Record<SiteLocale, SiteMessages> = {
  [SiteLocale.En]: siteEn,
  [SiteLocale.De]: siteDe,
  [SiteLocale.Es]: siteEs,
  [SiteLocale.Fr]: siteFr,
  [SiteLocale.Ja]: siteJa,
  [SiteLocale.PtBr]: sitePtBr,
  [SiteLocale.ZhCn]: siteZhCn,
};

/** The language the app speaks to a visitor of each page: English where it is not translated yet. */
const APP_LOCALE: Record<SiteLocale, AppLocale> = {
  [SiteLocale.En]: 'en',
  [SiteLocale.De]: 'en',
  [SiteLocale.Es]: 'en',
  [SiteLocale.Fr]: 'fr',
  [SiteLocale.Ja]: 'en',
  [SiteLocale.PtBr]: 'en',
  [SiteLocale.ZhCn]: 'en',
};
const APP_MESSAGES: Record<AppLocale, Translation> = {
  en: appEn,
  fr: appFr,
};

export function createText(locale: SiteLocale): Text {
  const appLocale = APP_LOCALE[locale];
  // in the message's own language: Japanese plural rules, which have no `one`, print "1 rows"
  const format = (
    message: string,
    values?: Values,
    messageLocale: string = locale
  ): string =>
    String(new IntlMessageFormat(message, messageLocale).format(values));

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
    app: (key, values) =>
      format(APP_MESSAGES[appLocale][key], values, appLocale),
  };
}

const TextContext = createContext<Text>(createText(SiteLocale.En));

export const TextProvider = TextContext.Provider;

export function useText(): Text {
  return useContext(TextContext);
}
