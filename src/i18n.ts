import i18n from 'i18next';
import { useTranslation, initReactI18next } from 'react-i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)['en'];
  }
}

const resources = {
  en: {
    translation: {
      cancel: 'Cancel',
      edit: 'Edit',
      save: 'Save',
      'connect.pleaseConnect': 'Please connect',
      'connect.new': 'New…',
      'theme.switch.label': 'Theme:',
      'connection.create.button': 'Create connection…',
      'connection.form.name.label': 'Name',
      'connection.form.host.label': 'Host',
      'connection.form.port.label': 'Port',
      'connection.form.user.label': 'User',
      'connection.form.password.label': 'Password',
      'connection.form.saveConnection': 'Save connection',
      'connection.form.action.connect': 'Connect',
      'connection.form.action.saveAndConnect': 'Save and connect',
      'table.rows.loadMore': 'Load more…',
    },
  },
  fr: {
    translation: {
      cancel: 'Annuler',
      edit: 'Modifier',
      save: 'Enregistrer',
      'connect.pleaseConnect': 'Veuillez vous connecter',
      'connect.new': 'Nouveau…',
      'theme.switch.label': 'Thème :',
      'connection.create.button': 'Créer une connexion…',
      'connection.form.name.label': 'Nom',
      'connection.form.host.label': 'Hôte',
      'connection.form.port.label': 'Port',
      'connection.form.user.label': 'Utilisateur',
      'connection.form.password.label': 'Mot de passe',
      'connection.form.saveConnection': 'Enregistrer la connexion',
      'connection.form.action.connect': 'Connecter',
      'connection.form.action.saveAndConnect': 'Enregistrer et connecter',
      'table.rows.loadMore': 'Charger plus…',
    },
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

export { useTranslation };
