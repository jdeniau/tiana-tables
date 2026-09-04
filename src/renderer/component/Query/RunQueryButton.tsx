import { ReactElement } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import { RunMode, toRunMode } from '../../../sql/runMode';
import {
  background,
  commentForeground,
  display,
  displayWeight,
} from '../../theme';
import { KeyboardShortcut } from '../KeyboardShortcut';

const RUN_MODES = [RunMode.Current, RunMode.All];

/** the key the editor binds to run the statement under the caret */
const SUBMIT_KEY = 'Enter';

/** the one word set in the display face outside a region name */
const RunLabel = styled.span`
  font-family: ${display};
  font-weight: ${displayWeight};
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

/**
 * The two segments sit flush, as a plain row rather than a `Space.Compact`:
 * the compact group draws its own divider between two solid buttons, in the
 * hover colour, where the design wants the background at 35 %.
 */
const RunGroup = styled.div`
  display: inline-flex;
`;

const CaretButton = styled(Button)`
  &&& {
    border-inline-start-color: color-mix(
      in srgb,
      ${background} 35%,
      transparent
    );
  }
`;

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
    <Button
      disabled={disabled}
      color="primary"
      variant="solid"
      onClick={() => onRun(RunMode.Current)}
    >
      <RunLabel>{t('rawSql.submit')}</RunLabel>
      <KeyboardShortcut cmdOrCtrl pressedKey={SUBMIT_KEY} />
    </Button>
  );

  if (statementCount <= 1) {
    return runButton;
  }

  return (
    <RunGroup>
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
        <CaretButton
          disabled={disabled}
          color="primary"
          variant="solid"
          icon={<DownOutlined />}
          aria-label={t('rawSql.run.more')}
        />
      </Dropdown>
    </RunGroup>
  );
}
