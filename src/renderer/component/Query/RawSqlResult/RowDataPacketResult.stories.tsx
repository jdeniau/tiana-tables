import type { Meta, StoryObj } from '@storybook/react';
import { Fetcher } from 'react-router';
import reactRouterDecorator from '../../../../../.storybook/decorators/reactRouterDecorator';
import { AllColumnsContextProvider } from '../../../../contexts/AllColumnsContext';
import { ForeignKeysContextProvider } from '../../../../contexts/ForeignKeysContext';
import { SqlError } from '../../../../sql/errorSerializer';
import { FieldKind, type ResultField } from '../../../../sql/resultField';
import type { ResultRow, WriteResult } from '../../../../sql/types';
import RawSqlResult, {
  SqlActionReturnTypes,
  StatementOutcome,
} from './RowDataPacketResult';

const FIELDS: ResultField[] = [
  { name: 'id', kind: FieldKind.Number, table: 'employe' },
  { name: 'name', kind: FieldKind.String, table: 'employe' },
];

const ROWS = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
  { id: 3, name: 'Margaret' },
] as ResultRow[];

const WRITTEN: WriteResult = { affectedRows: 3, insertId: 42 };

const ERROR = {
  name: 'Error',
  message: "Table 'shop.nope' doesn't exist",
  code: 'ER_NO_SUCH_TABLE',
  errno: 1146,
  sql: 'SELECT * FROM nope',
  sqlMessage: "Table 'shop.nope' doesn't exist",
  sqlState: '42S02',
} as SqlError;

const SELECT: StatementOutcome = {
  sql: 'SELECT id, name FROM employe LIMIT 10;',
  result: [ROWS, FIELDS],
  hasLimit: true,
  durationMs: 42,
};

const UPDATE: StatementOutcome = {
  sql: "UPDATE employe SET name = 'Ada Lovelace' WHERE id = 1;",
  result: [WRITTEN, []],
  hasLimit: false,
  durationMs: 7,
};

const FAILED: StatementOutcome = {
  sql: 'SELECT * FROM nope;',
  error: ERROR,
};

/** the panel only ever reads `state` and `data` off the fetcher */
function fetcherOf(outcomes: StatementOutcome[]) {
  return {
    state: 'idle',
    data: { outcomes },
  } as unknown as Fetcher<SqlActionReturnTypes>;
}

const meta: Meta<typeof RawSqlResult> = {
  component: RawSqlResult,
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <ForeignKeysContextProvider foreignKeys={[]}>
        <AllColumnsContextProvider allColumns={[]}>
          <div
            style={{ height: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <Story />
          </div>
        </AllColumnsContextProvider>
      </ForeignKeysContextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RawSqlResult>;

/** one statement: the result panel is the only thing on screen */
export const OneStatement: Story = {
  args: { fetcher: fetcherOf([SELECT]) },
};

/** every statement of the editor: one tab each, named after the query */
export const SeveralStatements: Story = {
  args: { fetcher: fetcherOf([SELECT, UPDATE, SELECT]) },
};

/** a run stops at the first error, and opens on it */
export const StoppedOnAnError: Story = {
  args: { fetcher: fetcherOf([SELECT, UPDATE, FAILED]) },
};

/** an editor holding only comments has nothing to run */
export const NothingToRun: Story = {
  args: { fetcher: fetcherOf([]) },
};
