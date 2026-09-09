import { ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { ViewSwitch, ViewSwitchLink } from './Style/ViewSwitch';

/**
 * The two views of a table — its data and its structure — as the switch of
 * the region header, the current one filled.
 *
 * Both views read the same three params from the URL, so the switch is the
 * same component on both pages: whichever one is open, the other is one click
 * away. Which one that is, is `NavLink`'s to tell.
 *
 * The data link carries no `?where`: the loader restores the filter stored for
 * the table, which is the one the user left it on. Matching ignores the query
 * string, so the segment is filled whether or not a filter is on.
 */
export default function TableViewSwitch(): ReactElement | null {
  const { t } = useTranslation();
  const { connectionSlug, databaseName, tableName } = useParams();

  if (!connectionSlug || !databaseName || !tableName) {
    return null;
  }

  const tableUrl = `/connections/${connectionSlug}/${databaseName}/tables/${tableName}`;

  return (
    <ViewSwitch aria-label={t('table.view.label')}>
      {/* `end`, or the structure page would fill both segments */}
      <ViewSwitchLink end to={tableUrl}>
        {t('table.tab.data')}
      </ViewSwitchLink>

      <ViewSwitchLink to={`${tableUrl}/structure`}>
        {t('table.tab.structure')}
      </ViewSwitchLink>
    </ViewSwitch>
  );
}
