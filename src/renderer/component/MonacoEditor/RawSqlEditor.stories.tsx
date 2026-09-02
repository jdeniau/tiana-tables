import type { Meta, StoryObj } from '@storybook/react';
import { AllColumnsContextProvider } from '../../../contexts/AllColumnsContext';
import { ForeignKeysContextProvider } from '../../../contexts/ForeignKeysContext';
import { TableListContextProvider } from '../../../contexts/TableListContext';
import { RawSqlEditor } from './RawSqlEditor';

const meta: Meta<typeof RawSqlEditor> = {
  component: RawSqlEditor,
  args: {
    style: { width: '100vw', height: '35vh' },
  },
  decorators: [
    (Story) => (
      <ForeignKeysContextProvider keyColumnUsageRows={[]}>
        <TableListContextProvider
          tableList={[
            // @ts-expect-error don't want all data, only the name
            { Name: 'employe' },
            // @ts-expect-error don't want all data, only the name
            { Name: 'title' },
          ]}
        >
          <AllColumnsContextProvider
            allColumns={[
              // @ts-expect-error don't want all data, only table and column
              { Table: 'employe', Column: 'id', DataType: 'int' },
              // @ts-expect-error don't want all data, only table and column
              { Table: 'employe', Column: 'gender', DataType: 'varchar' },
              // @ts-expect-error don't want all data, only table and column
              { Table: 'employe', Column: 'title_id', DataType: 'int' },
              // @ts-expect-error don't want all data, only table and column
              { Table: 'title', Column: 'id', DataType: 'int' },
              // @ts-expect-error don't want all data, only table and column
              { Table: 'title', Column: 'title', DataType: 'varchar' },
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
        keyColumnUsageRows={[
          // @ts-expect-error issue with contstructor name
          {
            TABLE_NAME: 'employe',
            COLUMN_NAME: 'title_id',
            REFERENCED_TABLE_NAME: 'title',
            REFERENCED_COLUMN_NAME: 'id',
            CONSTRAINT_NAME: 'employe_title_id_fkey',
          },
          // @ts-expect-error issue with contstructor name
          {
            TABLE_NAME: 'planning',
            COLUMN_NAME: 'employe_id',
            REFERENCED_TABLE_NAME: 'employe',
            REFERENCED_COLUMN_NAME: 'id',
            CONSTRAINT_NAME: 'planning_employe_id_fkey',
          },
        ]}
      >
        <TableListContextProvider
          tableList={[
            // @ts-expect-error don't want all data, only the name
            { Name: 'employe' },
            // @ts-expect-error don't want all data, only the name
            { Name: 'title' },
            // @ts-expect-error don't want all data, only the name
            { Name: 'planning' },
          ]}
        >
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
