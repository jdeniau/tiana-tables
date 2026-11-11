import { Select } from 'antd';
import { LOCALE_LIST, localeName } from '../../configuration/locale';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useTranslation } from '../../i18n';

export default function LangSelector() {
  const { configuration, changeLanguage } = useConfiguration();
  const { t } = useTranslation();

  return (
    <Select
      // the word goes inside the control, there is no caption next to it
      prefix={t('language.switch.label')}
      style={{ width: '100%' }}
      popupMatchSelectWidth={false}
      onChange={(lang) => {
        if (lang) {
          //   window.config.changeLanguage(lang);
          changeLanguage(lang);
        }
      }}
      value={configuration.locale}
      // each language in its own name, so that a user lost in another one finds theirs
      options={LOCALE_LIST.map((locale) => ({
        value: locale,
        label: localeName(locale),
      }))}
    />
  );
}
