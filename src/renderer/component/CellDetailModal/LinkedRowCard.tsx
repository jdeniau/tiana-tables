import { type ReactElement, useState } from 'react';
import { styled } from 'styled-components';
import { getDatabaseAppState } from '../../../configuration/appState';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import {
  commentForeground,
  fontSize,
  foreground,
  size,
  space,
} from '../../theme';
import SqlErrorComponent from '../Query/SqlErrorComponent';
import { FieldRow, TextButton } from '../RowDetailPanel/FieldRow';
import { linkedRowFields, linkedRowKeyText } from './linkedRow';
import type { LinkedRow } from './useLinkedRow';

/** the columns a folded card shows */
const FOLDED_FIELD_COUNT = 4;

/** what a value reads while its row is looked up */
const PENDING_VALUE = '…';

/** The row a foreign key points at, under the editor of that key: folded to its first columns. */
export default function LinkedRowCard({
  linkedRow,
}: {
  linkedRow: LinkedRow;
}): ReactElement {
  const { t } = useTranslation();
  const { configuration } = useConfiguration();
  const { currentConnectionSlug } = useConnectionContext();
  const [expanded, setExpanded] = useState(false);

  const { foreignKey, key, isSearching, fields, row, error } = linkedRow;
  const { referencedDatabase, referencedTable } = foreignKey;
  const keyText = linkedRowKeyText(key);

  const displayAfterByColumn = currentConnectionSlug
    ? getDatabaseAppState(
        configuration,
        currentConnectionSlug,
        referencedDatabase
      )?.tables[referencedTable]?.displayAfterByColumn
    : undefined;

  const entries = linkedRowFields(
    row ?? {},
    fields ?? [],
    key.map(({ column }) => column),
    displayAfterByColumn
  ).map((entry) =>
    // the names of the last answer keep the card's height while the next one comes
    isSearching
      ? { ...entry, value: PENDING_VALUE, text: PENDING_VALUE }
      : entry
  );
  const shown = expanded ? entries : entries.slice(0, FOLDED_FIELD_COUNT);
  const hiddenCount = entries.length - shown.length;

  const body = (() => {
    if (error && !isSearching) {
      return <CardError error={error} />;
    }

    if (row === null && !isSearching) {
      return (
        <Message>
          {t('cell.detail.linkedRow.noRow', {
            table: referencedTable,
            key: keyText,
          })}
        </Message>
      );
    }

    return (
      <>
        <Fields data-expanded={expanded || undefined}>
          {shown.map((entry) => (
            <FieldRow key={entry.field.name} entry={entry} />
          ))}
        </Fields>
        {(hiddenCount > 0 || expanded) && (
          <Foot>
            <TextButton
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded
                ? t('table.rowDetail.collapse')
                : t('cell.detail.linkedRow.showMore', { count: hiddenCount })}
            </TextButton>
          </Foot>
        )}
      </>
    );
  })();

  return (
    <Card role="group" aria-label={t('cell.detail.linkedRow.label')}>
      <Head>
        <TableName>{referencedTable}</TableName>
        <KeyText>
          {isSearching
            ? `${keyText} · ${t('cell.detail.linkedRow.searching')}`
            : keyText}
        </KeyText>
      </Head>
      {body}
    </Card>
  );
}

const Card = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${commentForeground};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  height: ${size.row};
  padding: 0 ${space.md};
  border-bottom: 1px solid ${commentForeground};
`;

const TableName = styled.span`
  font-size: ${fontSize.base};
  color: ${foreground};
`;

const KeyText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${fontSize.sm};
  color: ${commentForeground};
`;

// a whole row scrolls past twelve of the grid's rows
const Fields = styled.div`
  display: flex;
  flex-direction: column;

  &[data-expanded] {
    max-height: calc(12 * ${size.row});
    overflow-y: auto;
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  height: ${size.row};
  padding: 0 ${space.md};
`;

const Message = styled.div`
  padding: ${space.sm} ${space.md};
  font-size: ${fontSize.sm};
  color: ${commentForeground};
`;

const CardError = styled(SqlErrorComponent)`
  && {
    margin: 0;
    border: 0;
  }
`;
