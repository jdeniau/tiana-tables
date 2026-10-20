import type { Meta, StoryObj } from '@storybook/react-vite';
import { useCreateAtom } from '@tanstack/react-store';
import type { RowSelectionState } from '@tanstack/react-table';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import connectionDecorator from '../../../../.storybook/decorators/connectionDecorator';
import reactRouterDecorator from '../../../../.storybook/decorators/reactRouterDecorator';
import { AllColumnsContextProvider } from '../../../contexts/AllColumnsContext';
import { DatabaseContext } from '../../../contexts/DatabaseContext';
import { ForeignKeysContextProvider } from '../../../contexts/ForeignKeysContext';
import { FieldKind, type ResultField } from '../../../sql/resultField';
import type { ResultRow } from '../../../sql/types';
import {
  Region,
  RegionBody,
  RegionGroup,
  RegionHeader,
  RegionName,
} from '../Style/Region';
import TableGrid from '../TableGrid';
import { NO_CURSOR, type RowCursor } from '../rowSelectionGesture';
import { WithRowDetailPanel } from './RowDetailPanel';

const field = (name: string, kind: FieldKind): ResultField => ({
  name,
  kind,
  table: 'comment',
});

// wide enough that the grid scrolls sideways in any window
const FIELDS: Array<ResultField> = [
  field('content', FieldKind.Text),
  field('id', FieldKind.Number),
  field('status', FieldKind.String),
  field('article_id', FieldKind.Number),
  field('user_id', FieldKind.Number),
  field('parent_id', FieldKind.Number),
  field('upvotes', FieldKind.Number),
  field('downvotes', FieldKind.Number),
  field('posted_at', FieldKind.DateTime),
  field('moderated_at', FieldKind.DateTime),
  field('moderated_by', FieldKind.Number),
  field('meta', FieldKind.Json),
];

const LONG =
  'I do not understand why the article leaves out the report of the regional audit office, published in March. It puts the overrun of the tramway at 38 million, which the council admitted.\n\nThanks for the map of the stations though, very clear.';

const ROWS: Array<ResultRow> = Array.from({ length: 40 }, (_, index) => ({
  id: 1201 + index,
  content: index === 2 ? LONG : `Comment number ${index + 1}`,
  status: index % 5 === 4 ? 'hidden' : 'published',
  article_id: 12 + Math.floor(index / 3),
  user_id: index % 4 === 3 ? null : 40 + index,
  parent_id: index % 3 === 0 ? null : 1200 + index,
  upvotes: (index * 7) % 31,
  downvotes: (index * 3) % 5,
  posted_at: `2026-10-19 ${String(8 + Math.floor(index / 4)).padStart(2, '0')}:${String((index * 13) % 60).padStart(2, '0')}:00`,
  moderated_at: null,
  moderated_by: null,
  meta: `{"client": "web", "index": ${index}}`,
}));

function RowDetailPanelDemo({
  rows,
  fields,
  primaryKeys,
}: {
  rows: Array<ResultRow>;
  fields: Array<ResultField>;
  primaryKeys?: Array<string>;
}) {
  const selectionAtom = useCreateAtom<RowSelectionState>({});
  const cursorAtom = useCreateAtom<RowCursor>(NO_CURSOR);
  const panelOpenAtom = useCreateAtom(false);

  return (
    <WithRowDetailPanel
      rows={rows}
      fields={fields}
      primaryKeys={primaryKeys}
      rowsAsArray={false}
      selectionAtom={selectionAtom}
      cursorAtom={cursorAtom}
      panelOpenAtom={panelOpenAtom}
    >
      <Region>
        <RegionHeader>
          <RegionGroup>
            <RegionName>comment</RegionName>
          </RegionGroup>
        </RegionHeader>
        <RegionBody>
          <TableGrid
            fields={fields}
            result={rows}
            primaryKeys={primaryKeys}
            selectionAtom={selectionAtom}
            cursorAtom={cursorAtom}
            panelOpenAtom={panelOpenAtom}
          />
        </RegionBody>
      </Region>
    </WithRowDetailPanel>
  );
}

const meta: Meta<typeof RowDetailPanelDemo> = {
  component: RowDetailPanelDemo,
  decorators: [
    reactRouterDecorator,
    connectionDecorator,
    (Story) => (
      <DatabaseContext value={{ database: 'shop', setDatabase: () => {} }}>
        <ForeignKeysContextProvider
          foreignKeys={[
            {
              table: 'comment',
              column: 'article_id',
              referencedDatabase: 'shop',
              referencedTable: 'article',
              referencedColumn: 'id',
            },
          ]}
          database="shop"
        >
          <AllColumnsContextProvider allColumns={[]}>
            <div style={{ height: '90vh', display: 'flex' }}>
              <Story />
            </div>
          </AllColumnsContextProvider>
        </ForeignKeysContextProvider>
      </DatabaseContext>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RowDetailPanelDemo>;

/** the eyes of the rows, in view however wide the columns */
function eyes(canvasElement: HTMLElement): Array<HTMLButtonElement> {
  return [
    ...canvasElement.querySelectorAll<HTMLButtonElement>(
      'button[aria-pressed]'
    ),
  ].filter((button) => button.closest('tr'));
}

function panel(canvasElement: HTMLElement): HTMLElement | null {
  return canvasElement.querySelector('aside');
}

/**
 * The eye of a row opens it beside the grid, ↓ moves the row shown, a chip
 * switches between the selected rows, and Escape closes the panel with the selection.
 */
export const Table: Story = {
  args: { rows: ROWS, fields: FIELDS, primaryKeys: ['id'] },
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector<HTMLElement>('[tabindex="0"]');

    if (!scroller) {
      throw new Error('No selectable grid');
    }

    // the columns overflow, and the eye stays in view
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    const third = eyes(canvasElement)[2];
    expect(third.getBoundingClientRect().right).toBeLessThanOrEqual(
      scroller.getBoundingClientRect().left + scroller.clientWidth
    );

    await userEvent.click(third);

    await waitFor(() => expect(panel(canvasElement)).not.toBeNull());
    const aside = within(panel(canvasElement) as HTMLElement);
    // the key leads, whatever the order of the fields
    expect(aside.getByText('id = 1203 · 3 / 40')).toBeTruthy();
    expect(aside.getByText(/regional audit office/)).toBeTruthy();
    expect(third.getAttribute('aria-pressed')).toBe('true');

    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(aside.getByText('id = 1204 · 4 / 40')).toBeTruthy()
    );

    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    await waitFor(() =>
      expect(aside.getByText('2 selected rows')).toBeTruthy()
    );
    await userEvent.click(aside.getByRole('button', { name: '1204' }));
    await waitFor(() =>
      expect(aside.getByText('id = 1204 · 4 / 40')).toBeTruthy()
    );

    await userEvent.type(aside.getByLabelText('Column or value…'), 'vote');
    expect(aside.getByText('upvotes')).toBeTruthy();
    expect(aside.queryByText('status')).toBeNull();

    // a click in the grid selects its row alone, and gives the grid the keys back
    await userEvent.click(within(scroller).getByText('Comment number 6'));
    await waitFor(() =>
      expect(aside.getByText(/^id = 1206 · 6 \/ 40/)).toBeTruthy()
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(panel(canvasElement)).toBeNull());
  },
};

/** Without a key, a row is named by its position. */
export const WithoutPrimaryKey: Story = {
  args: { rows: ROWS, fields: FIELDS },
  play: async ({ canvasElement }) => {
    await userEvent.click(eyes(canvasElement)[0]);

    await waitFor(() => expect(panel(canvasElement)).not.toBeNull());
    expect(
      within(panel(canvasElement) as HTMLElement).getByText('1 / 40')
    ).toBeTruthy();

    await userEvent.click(eyes(canvasElement)[0]);
    await waitFor(() => expect(panel(canvasElement)).toBeNull());
  },
};
