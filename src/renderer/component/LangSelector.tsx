import { Select } from 'antd';
import { LOCALE_LIST } from '../../configuration/locale';
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
      options={LOCALE_LIST.map((key) => ({
        value: key,
        label: key,
      }))}
    />
  );
}
