import { ReactElement } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { Dropdown, Space } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import { RunMode, toRunMode } from '../../../sql/runMode';
import { commentForeground } from '../../theme';
import { KeyboardShortcut } from '../KeyboardShortcut';
import { ActionButton } from '../Style/ActionButton';

const RUN_MODES = [RunMode.Current, RunMode.All];

/** the key the editor binds to run the statement under the caret */
const SUBMIT_KEY = 'Enter';

const OptionTitle = styled.div`
  font-weight: 600;
`;

const OptionDescription = styled.div`
  color: ${commentForeground};
  font-size: 11px;
  max-width: 24em;
  white-space: normal;
`;

type Props = {
  disabled: boolean;
  /**
   * How many statements the editor holds. With a single one there is nothing
   * to choose, so the button drops its dropdown altogether.
   */
  statementCount: number;
  onRun: (mode: RunMode) => void;
};

/**
 * The submit button of the SQL editor: it runs the statement under the caret,
 * and its dropdown holds the other ways to run the editor.
 */
export function RunQueryButton({
  disabled,
  statementCount,
  onRun,
}: Props): ReactElement {
  const { t } = useTranslation();

  const runButton = (
    <ActionButton disabled={disabled} onClick={() => onRun(RunMode.Current)}>
      {t('rawSql.submit')}
      <KeyboardShortcut cmdOrCtrl pressedKey={SUBMIT_KEY} />
    </ActionButton>
  );

  if (statementCount <= 1) {
    return runButton;
  }

  // `Space.Compact` + `Dropdown` + `Button` is what antd 6 recommends in place
  // of the deprecated `Dropdown.Button`; its divider between the two solid
  // segments is antd's own
  return (
    <Space.Compact>
      {runButton}

      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: RUN_MODES.map((mode) => ({
            key: mode,
            label: (
              <>
                <OptionTitle>
                  {t('rawSql.run.label', { mode })}
                  {mode === RunMode.Current && (
                    <KeyboardShortcut cmdOrCtrl pressedKey={SUBMIT_KEY} />
                  )}
                </OptionTitle>
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
        <ActionButton
          disabled={disabled}
          icon={<DownOutlined />}
          aria-label={t('rawSql.run.more')}
        />
      </Dropdown>
    </Space.Compact>
  );
}
