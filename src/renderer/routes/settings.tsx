import { Flex } from 'antd';
import packageJson from '../../../package.json';
import { useTranslation } from '../../i18n';
import LangSelector from '../component/LangSelector';
import {
  Centered,
  FramedRegion,
  FramedRegionBody,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../component/Style/Region';
import ThemeSelector from '../component/ThemeSelector';
import { space } from '../theme';

/** Language, theme and what version this is, reached from the native menu (`CmdOrCtrl+,`). */
export default function Settings() {
  const { t } = useTranslation();

  return (
    <Centered>
      <FramedRegion>
        <RegionHeader>
          <RegionName>{t('settings.title')}</RegionName>
        </RegionHeader>

        <FramedRegionBody>
          <Flex vertical gap={space.md}>
            <LangSelector />
            <ThemeSelector />
            <RegionMeta>v{packageJson.version}</RegionMeta>
          </Flex>
        </FramedRegionBody>
      </FramedRegion>
    </Centered>
  );
}
