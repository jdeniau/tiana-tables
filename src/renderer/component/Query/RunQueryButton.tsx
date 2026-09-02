import { ReactElement } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Space } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import { RunMode, toRunMode } from '../../../sql/runMode';
import { mutedForeground } from '../../theme';

const RUN_MODES = [RunMode.Current, RunMode.All];

const OptionTitle = styled.div`
  font-weight: 600;
`;

const OptionDescription = styled.div`
  color: ${mutedForeground};
  font-size: 0.85em;
  max-width: 24em;
  white-space: normal;
`;

type Props = {
  disabled: boolean;
  onRun: (mode: RunMode) => void;
};

/**
 * The submit button of the SQL editor: it runs the statement under the caret,
 * and its dropdown holds the other ways to run the editor.
 */
export function RunQueryButton({ disabled, onRun }: Props): ReactElement {
  const { t } = useTranslation();

  return (
    <Space.Compact>
      <Button
        disabled={disabled}
        color="primary"
        variant="solid"
        onClick={() => onRun(RunMode.Current)}
      >
        {t('rawSql.submit')}
      </Button>

      <Dropdown
        trigger={['click']}
        placement="bottomLeft"
        menu={{
          items: RUN_MODES.map((mode) => ({
            key: mode,
            label: (
              <>
                <OptionTitle>{t('rawSql.run.label', { mode })}</OptionTitle>
                <OptionDescription>
                  {t('rawSql.run.description', { mode })}
                </OptionDescription>
              </>
            ),
          })),
          onClick: ({ key }) => {
            const mode = toRunMode(key);

            if (mode) {
              onRun(mode);
            }
          },
        }}
      >
        <Button
          disabled={disabled}
          color="primary"
          variant="solid"
          icon={<DownOutlined />}
          aria-label={t('rawSql.run.more')}
        />
      </Dropdown>
    </Space.Compact>
  );
}
