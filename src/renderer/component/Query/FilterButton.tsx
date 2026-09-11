import { ReactElement } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { Dropdown, Space } from 'antd';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';
import { useTranslation } from '../../../i18n';
import { accent, fontSize, foreground, size, space } from '../../theme';
import { ActionButton } from '../Style/ActionButton';

/** the square before an active item — the one selection motif of the frame */
const PIP = '6px';

/**
 * A filter is stored on as many lines as it was typed, and a menu row is one
 * line: the breaks become the spaces they stand for.
 */
function singleLine(filter: string): string {
  return filter.trim().replace(/\s+/g, ' ');
}

// the menu item has no padding of its own (see the `Menu` tokens): the row
// owns it, so that the whole width of it is the link
const Entry = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${PIP};
  height: ${size.control};
  max-width: 48ch;
  padding: 0 ${space.sm};
  font-size: ${fontSize.sm};
  color: ${foreground};

  &:hover {
    color: ${foreground};
  }
`;

const Pip = styled.span`
  flex: none;
  width: ${PIP};
  height: ${PIP};
  background: ${accent};
`;

const Label = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type Props = {
  /** the filters this table was given, most recent first */
  history: Array<string>;
  /** the clause the table is showing, marked in the list */
  current: string;
};

/**
 * The submit button of the filter region: it applies the clause in the
 * editor, and its dropdown holds the filters this table was given before —
 * the same button and caret as the SQL page's Run.
 */
export function FilterButton({ history, current }: Props): ReactElement {
  const { t } = useTranslation();

  const filterButton = (
    <ActionButton htmlType="submit">{t('filter')}</ActionButton>
  );

  // a history that holds nothing but the filter already applied leaves
  // nothing to choose
  if (!history.some((filter) => filter !== current)) {
    return filterButton;
  }

  // `Space.Compact` + `Dropdown` + `Button` is what antd 6 recommends in place
  // of the deprecated `Dropdown.Button`; its divider between the two solid
  // segments is antd's own
  return (
    <Space.Compact>
      {filterButton}

      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: history.map((filter) => ({
            key: filter,
            label: (
              // a filter is a place this table can be seen at, so it is a
              // link: `?where=` is what the loader reads
              <Entry to={`?where=${encodeURIComponent(filter)}`} title={filter}>
                {filter === current && <Pip />}
                <Label>{singleLine(filter)}</Label>
              </Entry>
            ),
          })),
        }}
      >
        <ActionButton
          icon={<DownOutlined />}
          aria-label={t('table.filters.history')}
        />
      </Dropdown>
    </Space.Compact>
  );
}
