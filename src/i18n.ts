import i18n, { changeLanguage, t } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import en from '../locales/en';
import fr from '../locales/fr';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)['en'];
  }
}

const resources = {
  en: {
    translation: en,
  },
  fr: {
    translation: fr,
  },
} as const;

// eslint-disable-next-line import/no-named-as-default-member
i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // the translations
    // (tip move them in a JSON file and import them,
    // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
    resources,
    // lng: 'en', // if you're using a language detector, do not define the lng option
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
  });

export { useTranslation, t, changeLanguage };
