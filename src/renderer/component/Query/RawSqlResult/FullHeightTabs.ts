import { Tabs } from 'antd';
import { styled } from 'styled-components';

/**
 * Tabs whose active pane fills the panel.
 *
 * antd sizes `-content-holder` but leaves `-content` and `-tabpane` as plain
 * blocks, so a child that sizes itself with `flex: 1; min-height: 0` — both
 * `TableGrid` and the chart do — collapses to nothing inside a tab. The chain
 * has to be flex all the way down for them to get a height.
 */
export const FullHeightTabs = styled(Tabs)`
  height: 100%;
  min-height: 0;

  .ant-tabs-content {
    height: 100%;
    display: flex;
  }

  /* the :not() matters: antd hides the inactive pane with a single-class
     \`display: none\`, which this rule would otherwise override */
  .ant-tabs-tabpane:not(.ant-tabs-tabpane-hidden) {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
`;
