import { Select } from 'antd';
import { LOCALE_LIST } from '../../../configuration/locale';
import { useConfiguration } from '../../../contexts/ConfigurationContext';

export default function LangSelector() {
  const { configuration, changeLanguage } = useConfiguration();

  return (
    <Select
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
