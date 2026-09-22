import type { Meta, StoryObj } from '@storybook/react';
import { AllColumnsContextProvider } from '../../../contexts/AllColumnsContext';
import { ForeignKeysContextProvider } from '../../../contexts/ForeignKeysContext';
import { TableListContextProvider } from '../../../contexts/TableListContext';
import type { ColumnDetail } from '../../../sql/dialect/metadata';
import { RawSqlEditor } from './RawSqlEditor';

/** the schema the completion reads: a table and a column */
function column(table: string, name: string): ColumnDetail {
  return {
    table,
    name,
    nullable: true,
    generated: false,
    binary: false,
    json: false,
    allowedValues: [],
    multiValued: false,
  };
}

const meta: Meta<typeof RawSqlEditor> = {
  component: RawSqlEditor,
  args: {
    style: { width: '100vw', height: '35vh' },
  },
  decorators: [
    (Story) => (
      <ForeignKeysContextProvider foreignKeys={[]}>
        <TableListContextProvider tableList={['employe', 'title']}>
          <AllColumnsContextProvider
            allColumns={[
              column('employe', 'id'),
              column('employe', 'gender'),
              column('employe', 'title_id'),
              column('title', 'id'),
              column('title', 'title'),
            ]}
          >
            <Story />
          </AllColumnsContextProvider>
        </TableListContextProvider>
      </ForeignKeysContextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RawSqlEditor>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  args: {
    defaultValue: `SELECT *
FROM employe e
JOIN title ON e.title_id = title.id
WHERE e.gender = 'F' -- test comment
  AND titles.title = 'Senior Engineer'
LIMIT 10;`,
  },
};

/** several statements: the one the caret sits in is the one Ctrl+Enter runs */
export const SeveralStatements: Story = {
  args: {
    defaultValue: `SELECT * FROM employe WHERE gender = 'F';

-- count them
SELECT COUNT(*) FROM employe;

UPDATE title SET title = 'Engineer' WHERE id = 1;`,
  },
};

export const WithTablesAnsForeignKeys: Story = {
  args: {
    defaultValue: `SELECT *
FROM employe e
JOIN 
`,
  },
  decorators: [
    (Story) => (
      <ForeignKeysContextProvider
        foreignKeys={[
          {
            table: 'employe',
            column: 'title_id',
            referencedTable: 'title',
            referencedColumn: 'id',
          },
          {
            table: 'planning',
            column: 'employe_id',
            referencedTable: 'employe',
            referencedColumn: 'id',
          },
        ]}
      >
        <TableListContextProvider tableList={['employe', 'title', 'planning']}>
          <Story />
        </TableListContextProvider>
      </ForeignKeysContextProvider>
    ),
  ],
};

/** the table filter: the editor holds the body of a `WHERE` clause, no more */
export const AsATableFilter: Story = {
  args: {
    defaultValue: `e.gender = 'F'`,
    queryPrefix: 'SELECT * FROM `employe` e WHERE ',
    monacoOptions: { lineNumbers: 'off' },
  },
};
