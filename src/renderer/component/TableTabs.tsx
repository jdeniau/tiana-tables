import {
  ReactElement,
  WheelEvent,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useParams } from 'react-router-dom';
import { styled } from 'styled-components';
import { useOpenTablesContext } from '../../contexts/OpenTablesContext';
import { useTranslation } from '../../i18n';
import { commentForeground, size, space } from '../theme';
import { TabStrip, TabStripClosableLink } from './Style/TabStrip';

/** The open tables, over the whole content panel: they belong to the workspace, so Data and Structure share them. */
const Bar = styled.div`
  display: flex;
  flex: none;
  align-items: center;
  height: ${size.regionHeader};
  padding: 0 ${space.md};
  border-bottom: 1px solid ${commentForeground};
`;

export default function TableTabs(): ReactElement | null {
  const { t } = useTranslation();
  const { tabs, memoriseTable, closeTable } = useOpenTablesContext();
  const { connectionSlug, databaseName, tableName } = useParams();
  const activeTab = useRef<HTMLDivElement>(null);

  // a tab reached from the table list or a foreign key may sit outside the scrolled run
  useEffect(() => {
    activeTab.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [tableName]);

  // A mouse has one wheel, and it turns the wrong way for a run of tabs: its vertical notches scroll it sideways.
  // A trackpad's own horizontal gesture arrives as `deltaX`, and is left to the browser.
  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const strip = event.currentTarget;

    if (!event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return;
    }

    strip.scrollLeft += event.deltaY;
  }, []);

  // no tab, no bar: an empty 32px row and its rule would frame nothing
  if (!tabs.length) {
    return null;
  }

  return (
    <Bar>
      <TabStrip $scroll onWheel={handleWheel}>
        {tabs.map((tab) => {
          const active = tab.name === tableName;

          return (
            <TabStripClosableLink
              key={tab.name}
              ref={active ? activeTab : undefined}
              active={active}
              preview={tab.preview}
              title={tab.name}
              to={`/connections/${connectionSlug}/${databaseName}/tables/${tab.name}`}
              onDoubleClick={() => memoriseTable(tab.name)}
              onClose={() => closeTable(tab.name)}
              closeLabel={t('tableTabs.close')}
            >
              {tab.name}
            </TabStripClosableLink>
          );
        })}
      </TabStrip>
    </Bar>
  );
}
