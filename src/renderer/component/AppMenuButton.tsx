import { MouseEvent, ReactElement, useState } from 'react';
import { CheckOutlined, MenuOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps } from 'antd';
import { styled } from 'styled-components';
import { useTranslation } from '../../i18n';
import {
  AppMenuItem,
  AppMenuItemKind,
  MenuItemPath,
} from '../../preload/titleBarChannel';
import { acceleratorLabel } from '../acceleratorLabel';
import { fontSize, mono } from '../theme';

type MenuItems = NonNullable<MenuProps['items']>;

const keyOf = (path: MenuItemPath): string => path.join('.');
const pathOf = (key: string): MenuItemPath => key.split('.').map(Number);

const isCheckable = (item: AppMenuItem): boolean =>
  item.kind === AppMenuItemKind.Action && item.checked !== undefined;

function toMenuItems(items: Array<AppMenuItem>): MenuItems {
  // a check column for the whole menu, so that every label starts at the same place
  const checkColumn = items.some(isCheckable);

  return items.map((item) => {
    switch (item.kind) {
      case AppMenuItemKind.Separator:
        return { type: 'divider' };
      case AppMenuItemKind.Submenu:
        return {
          key: keyOf(item.path),
          label: item.label,
          disabled: !item.enabled,
          children: toMenuItems(item.items),
        };
      case AppMenuItemKind.Action:
        return {
          key: keyOf(item.path),
          label: item.label,
          disabled: !item.enabled,
          icon: checkColumn ? <Check $hidden={!item.checked} /> : undefined,
          // antd keeps the extra in its description colour on a disabled item
          extra: item.accelerator && (
            <Accelerator $disabled={!item.enabled}>
              {acceleratorLabel(item.accelerator)}
            </Accelerator>
          ),
        };
    }
  });
}

// every Edit entry acts on the focused element, which neither the button nor the menu may take
function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

/**
 * Opens the application menu, which has no bar of its own once the title bar
 * is ours. macOS keeps it in the system bar, so it gets no button.
 */
export default function AppMenuButton(): ReactElement | null {
  const { t } = useTranslation();
  // null while closed: the items are read from the main process on each opening
  const [items, setItems] = useState<Array<AppMenuItem> | null>(null);

  if (window.isMac) {
    return null;
  }

  async function onOpenChange(open: boolean): Promise<void> {
    setItems(open ? await window.titleBar.getMenu() : null);
  }

  return (
    <Dropdown
      open={items !== null}
      trigger={['click']}
      onOpenChange={onOpenChange}
      menu={{
        items: toMenuItems(items ?? []),
        selectable: false,
        onClick: ({ key }) => window.titleBar.clickMenuItem(pathOf(key)),
      }}
      // React events cross portals, so this also covers the submenus' popups
      popupRender={(menu) => <div onMouseDown={keepFocus}>{menu}</div>}
      destroyOnHidden
    >
      <Button
        type="text"
        size="small"
        icon={<MenuOutlined />}
        aria-label={t('menu.title')}
        title={t('menu.title')}
        onMouseDown={keepFocus}
      />
    </Dropdown>
  );
}

const Accelerator = styled.span<{ $disabled: boolean }>`
  font-family: ${mono};
  font-size: ${fontSize.sm};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
`;

const Check = styled(CheckOutlined)<{ $hidden: boolean }>`
  visibility: ${({ $hidden }) => ($hidden ? 'hidden' : 'visible')};
`;
