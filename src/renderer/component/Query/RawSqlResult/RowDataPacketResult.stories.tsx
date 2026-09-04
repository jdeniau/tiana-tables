import type { Meta, StoryObj } from '@storybook/react';
import { Types } from 'mysql';
import type {
  FieldPacket,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import { Fetcher } from 'react-router';
import reactRouterDecorator from '../../../../../.storybook/decorators/reactRouterDecorator';
import { AllColumnsContextProvider } from '../../../../contexts/AllColumnsContext';
import { ForeignKeysContextProvider } from '../../../../contexts/ForeignKeysContext';
import { SqlError } from '../../../../sql/errorSerializer';
import RawSqlResult, {
  SqlActionReturnTypes,
  StatementOutcome,
} from './RowDataPacketResult';

const FIELDS = [
  { name: 'id', type: Types.LONG, table: 'employe' },
  { name: 'name', type: Types.VAR_STRING, table: 'employe' },
] as unknown as FieldPacket[];

const ROWS = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
  { id: 3, name: 'Margaret' },
] as RowDataPacket[];

const HEADER = {
  fieldCount: 0,
  affectedRows: 3,
  insertId: 0,
  info: '',
  serverStatus: 2,
  warningStatus: 0,
} as ResultSetHeader;

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
  result: [HEADER, []],
  hasLimit: false,
  durationMs: 7,
};

const FAILED: StatementOutcome = {
  sql: 'SELECT * FROM nope;',
  error: ERROR,
};

/** the panel only ever reads `state` and `data` off the fetcher */
function fetcherOf(outcomes: StatementOutcome[]) {
  return { state: 'idle', data: { outcomes } } as unknown as Fetcher<
    SqlActionReturnTypes
  >;
}

const meta: Meta<typeof RawSqlResult> = {
  component: RawSqlResult,
  decorators: [
    reactRouterDecorator,
    (Story) => (
      <ForeignKeysContextProvider keyColumnUsageRows={[]}>
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
