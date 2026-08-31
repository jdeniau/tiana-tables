import { ReactNode, useState } from 'react';
import { Tabs } from 'antd';
import { styled } from 'styled-components';

interface FullHeightTabItem {
  key: string;
  label: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}

interface FullHeightTabsProps {
  defaultActiveKey: string;
  items: FullHeightTabItem[];
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const PaneHost = styled.div`
  flex: 1;
  min-height: 0;
`;

const Pane = styled.div<{ $active: boolean }>`
  display: ${({ $active }) => ($active ? 'flex' : 'none')};
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

/**
 * A tab switcher whose active pane fills the panel.
 *
 * antd's `Tabs` sizes its nav bar but leaves `.ant-tabs-content` and
 * `.ant-tabs-tabpane` as plain blocks, and hides the inactive pane through a
 * private `.ant-tabs-tabpane-hidden` class — any local override has to
 * out-specificity that class without knowing if antd changes it. Rather than
 * fight that internal DOM, `Tabs` here is used for the nav only (`items`
 * stripped of `children`), and this component owns the content area itself:
 * every pane stays mounted, so `TableGrid`'s virtualization state and the
 * chart's axis selection survive switching tabs, but only the active one is
 * `display: flex` — a rule this component fully owns, not one fighting antd.
 */
export function FullHeightTabs({
  defaultActiveKey,
  items,
}: FullHeightTabsProps) {
  const [activeKey, setActiveKey] = useState(defaultActiveKey);

  return (
    <Root>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={items.map(({ key, label, disabled }) => ({
          key,
          label,
          disabled,
        }))}
      />
      <PaneHost>
        {items.map(({ key, children }) => (
          <Pane key={key} $active={key === activeKey}>
            {children}
          </Pane>
        ))}
      </PaneHost>
    </Root>
  );
}
