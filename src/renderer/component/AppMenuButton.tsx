import { MouseEvent, ReactElement } from 'react';
import { MenuOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from '../../i18n';

/**
 * Opens the application menu, which has no bar of its own once the title bar
 * is ours. macOS keeps it in the system bar, so it gets no button.
 */
export default function AppMenuButton(): ReactElement | null {
  const { t } = useTranslation();

  if (window.isMac) {
    return null;
  }

  function openMenu(event: MouseEvent<HTMLButtonElement>): void {
    const { left, bottom } = event.currentTarget.getBoundingClientRect();

    window.titleBar.openMenu({ x: left, y: bottom });
  }

  return (
    <Button
      type="text"
      size="small"
      icon={<MenuOutlined />}
      aria-label={t('menu.title')}
      title={t('menu.title')}
      onClick={openMenu}
    />
  );
}
