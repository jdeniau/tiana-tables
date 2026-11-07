import type { Meta, StoryObj } from '@storybook/react-vite';
import type monaco from 'monaco-editor';
import { action } from 'storybook/actions';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import connectionDecorator from '../../../../.storybook/decorators/connectionDecorator';
import { ForeignKeysContextProvider } from '../../../contexts/ForeignKeysContext';
import type { ColumnDetail, ForeignKey } from '../../../sql/dialect/metadata';
import { mysqlDialect } from '../../../sql/dialect/mysql';
import { FieldKind, type ResultField } from '../../../sql/resultField';
import type { SelectRowRequest, SelectedRow } from '../../../sql/selectRow';
import type { SqlError } from '../../../sql/sqlError';
import {
  ConflictReason,
  type PrimaryKeyPart,
  type UpdateCellOutcome,
  UpdateCellStatus,
} from '../../../sql/updateCell';
import { CellWriteProvider, type SaveCell } from '../CellWrite';
import type { ColumnMeta } from '../TableGrid';
import CellDetailModal from './CellDetailModal';
import type { CellDetail } from './types';

function makeColumnDetail(
  name: string,
  overrides: Partial<ColumnDetail> = {}
): ColumnDetail {
  return {
    table: 'items',
    name,
    nullable: true,
    generated: false,
    binary: false,
    hasJsonType: false,
    allowedValues: [],
    multiValued: false,
    ...overrides,
  };
}

function makeColumn(
  name: string,
  kind: FieldKind,
  detail: ColumnDetail | undefined
): ColumnMeta {
  return {
    id: name,
    fieldIndex: 0,
    name,
    tableName: 'items',
    kind,
    width: '150px',
    pinnedLeft: null,
    isLastPinned: false,
    numeric: kind === FieldKind.Number,
    hasForeignKey: false,
    dialect: mysqlDialect,
    detail,
  };
}

const PRIMARY_KEY: Array<PrimaryKeyPart> = [{ column: 'id', value: 1 }];

function makeDetail(
  column: ColumnMeta,
  value: unknown,
  rowKey: Array<PrimaryKeyPart> | null = PRIMARY_KEY
): CellDetail {
  return {
    column,
    value,
    rowByColumn: { id: 1, [column.name]: value },
    rowKey,
    rowIndex: 0,
    rowId: '0',
  };
}

/** A save that succeeds, echoing back what a server would have stored. */
const saveSucceeds: SaveCell = async ({
  newValue,
}): Promise<UpdateCellOutcome> => {
  action('save')(newValue);

  return { status: UpdateCellStatus.Updated, value: newValue };
};

async function findMonacoEditor(): Promise<monaco.editor.ICodeEditor> {
  const { editor } = await import('monaco-editor');

  const mounted = await waitFor(
    () => {
      const [found] = editor.getEditors();

      if (!found) {
        throw new Error('Monaco has not mounted yet');
      }

      return found;
    },
    // its first load takes a few seconds
    { timeout: 10_000 }
  );

  // a space, a colon or a quote asks the JSON worker for completions, whose answer
  // throws "TextModelPart is disposed!" if it lands once the next story has unmounted the editor
  mounted.updateOptions({
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
  });

  return mounted;
}

/** Ctrl+Enter on the focused element, with the `keyCode` Monaco matches its bindings on and userEvent never sets. */
function pressCtrlEnter(): void {
  document.activeElement?.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
  );
}

const meta: Meta<typeof CellDetailModal> = {
  component: CellDetailModal,
  args: {
    onClose: action('onClose'),
  },
  // what the server answers a write with: `parameters.save`, a success by default
  // and the foreign keys of the database: `parameters.foreignKeys`, none by default
  decorators: [
    (Story, { parameters }) => (
      <ForeignKeysContextProvider
        foreignKeys={
          (parameters.foreignKeys as Array<ForeignKey> | undefined) ?? []
        }
        database="tiana_dev"
      >
        <CellWriteProvider
          save={(parameters.save as SaveCell | undefined) ?? saveSucceeds}
          onValueUpdated={action('onValueUpdated')}
        >
          <Story />
        </CellWriteProvider>
      </ForeignKeysContextProvider>
    ),
    connectionDecorator,
  ],
};

export default meta;
type Story = StoryObj<typeof CellDetailModal>;

export const LongText: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'description',
        FieldKind.Text,
        makeColumnDetail('description')
      ),
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20)
    ),
  },
};

export const Json: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'payload',
        FieldKind.Json,
        makeColumnDetail('payload', { hasJsonType: true })
      ),
      '{"nested":{"list":[1,2,3],"flag":true},"name":"tiana"}'
    ),
  },
};

// MariaDB's information_schema calls a JSON column `longtext`: the column is not `json`, the cell still is
export const InvalidJsonOnMariadb: Story = {
  args: {
    detail: makeDetail(
      makeColumn('payload', FieldKind.Json, makeColumnDetail('payload')),
      '{"name":"tiana"}'
    ),
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const editor = await findMonacoEditor();

    // Monaco reads keys through Chromium's EditContext, out of userEvent's reach: run what a keystroke runs
    editor.trigger('keyboard', 'cursorBottom', null);
    editor.trigger('keyboard', 'type', { text: ' {broken' });

    await expect(
      await body.findByText('This is not valid JSON.')
    ).toBeVisible();
    await expect(body.getByRole('button', { name: /^Save/ })).toBeDisabled();
  },
};

const saveTextOnKey = fn(saveSucceeds);

export const SaveTextWithCtrlEnter: Story = {
  args: {
    detail: makeDetail(
      makeColumn('name', FieldKind.String, makeColumnDetail('name')),
      'the value I loaded'
    ),
    onClose: fn(),
  },
  parameters: { save: saveTextOnKey },
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.type(body.getByRole('textbox'), ' and more');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    await expect(saveTextOnKey).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: 'the value I loaded and more' })
    );
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

const saveJsonOnKey = fn(saveSucceeds);

// Monaco binds the same key to "Insert Line Below": the form must claim it first
export const SaveJsonWithCtrlEnter: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'payload',
        FieldKind.Json,
        makeColumnDetail('payload', { hasJsonType: true })
      ),
      '{"name":"tiana"}'
    ),
  },
  parameters: { save: saveJsonOnKey },
  play: async () => {
    const editor = await findMonacoEditor();

    editor.focus();
    editor.trigger('keyboard', 'cursorBottom', null);
    // pressed in the same task as the keystroke: the draft must be rendered already
    editor.trigger('keyboard', 'type', { text: ' ' });
    pressCtrlEnter();

    await expect(editor.getValue()).toBe('{\n  "name": "tiana"\n} ');
    await expect(saveJsonOnKey).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: '{\n  "name": "tiana"\n} ' })
    );
  },
};

const saveJsonNull = fn(saveSucceeds);

// checking NULL empties the editor, and that must not uncheck it
export const SetJsonToNull: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'payload',
        FieldKind.Json,
        makeColumnDetail('payload', { hasJsonType: true })
      ),
      '{"name":"tiana"}'
    ),
  },
  parameters: { save: saveJsonNull },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const editor = await findMonacoEditor();
    const setNull = body.getByRole('checkbox', { name: 'Set to NULL' });

    await userEvent.click(setNull);
    await waitFor(() => expect(editor.getValue()).toBe(''));
    await userEvent.click(body.getByRole('button', { name: /^Save/ }));

    await expect(setNull).toBeChecked();
    await expect(saveJsonNull).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: null })
    );
  },
};

export const Enum: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'status',
        FieldKind.Text,
        makeColumnDetail('status', {
          allowedValues: ['draft', 'sent', 'paid'],
        })
      ),
      'sent'
    ),
  },
};

export const Datetime: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'createdAt',
        FieldKind.DateTime,
        makeColumnDetail('createdAt', {
          nullable: false,
        })
      ),
      '2026-01-15 10:30:00'
    ),
  },
};

export const Number: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'price',
        FieldKind.Number,
        makeColumnDetail('price', {
          nullable: false,
        })
      ),
      '1234.56'
    ),
  },
};

const saveEmptiedNumber = fn(saveSucceeds);

// emptied with Ctrl+Backspace on the way to another value, a nullable field stays a field
export const EmptyNullableNumber: Story = {
  args: {
    detail: makeDetail(
      makeColumn('stock', FieldKind.Number, makeColumnDetail('stock')),
      '42'
    ),
  },
  parameters: { save: saveEmptiedNumber },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const input = body.getByRole('spinbutton');

    await userEvent.clear(input);

    await expect(
      body.getByRole('checkbox', { name: 'Set to NULL' })
    ).not.toBeChecked();
    await expect(input).toBeEnabled();

    await userEvent.type(input, '7');
    await userEvent.click(body.getByRole('button', { name: /^Save/ }));

    await expect(saveEmptiedNumber).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: '7' })
    );
  },
};

export const NullValue: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'payload',
        FieldKind.Json,
        makeColumnDetail('payload', { hasJsonType: true })
      ),
      null
    ),
  },
};

// the row of a raw query result: nothing identifies it, so nothing can be written
export const ReadOnlyWithoutPrimaryKey: Story = {
  args: {
    detail: makeDetail(
      makeColumn('name', FieldKind.String, makeColumnDetail('name')),
      'read me',
      null
    ),
  },
};

export const ReadOnlyBinaryColumn: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'thumbnail',
        FieldKind.Text,
        makeColumnDetail('thumbnail', { binary: true })
      ),
      '\u0000\u0001binary bytes'
    ),
  },
};

export const ReadOnlyGeneratedColumn: Story = {
  args: {
    detail: makeDetail(
      makeColumn(
        'fullName',
        FieldKind.String,
        makeColumnDetail('fullName', { generated: true })
      ),
      'Tiana Tables'
    ),
  },
};

// type something, then save: the cell was written by someone else in between,
// so this modal closes and the conflict modal opens on it
export const ConflictOnSave: Story = {
  args: {
    detail: makeDetail(
      makeColumn('name', FieldKind.String, makeColumnDetail('name')),
      'the value I loaded'
    ),
  },
  parameters: {
    save: (async ({ newValue, force }) => {
      action('save')(newValue, { force });

      return force
        ? { status: UpdateCellStatus.Updated, value: newValue }
        : {
            status: UpdateCellStatus.Conflict,
            reason: ConflictReason.Changed,
            currentValue: 'what someone else wrote',
          };
    }) satisfies SaveCell,
  },
};

export const RowDeletedOnSave: Story = {
  args: {
    detail: makeDetail(
      makeColumn('name', FieldKind.String, makeColumnDetail('name')),
      'the value I loaded'
    ),
  },
  parameters: {
    save: (async ({ newValue }) => {
      action('save')(newValue);

      return {
        status: UpdateCellStatus.Conflict,
        reason: ConflictReason.Deleted,
      };
    }) satisfies SaveCell,
  },
};

// the server refuses the value: the preload throws the decoded error, a plain object
export const SqlErrorOnSave: Story = {
  args: {
    detail: makeDetail(
      makeColumn('name', FieldKind.String, makeColumnDetail('name')),
      'the value I loaded'
    ),
  },
  parameters: {
    save: (async ({ newValue }) => {
      action('save')(newValue);

      throw {
        name: 'Error',
        message: "Data too long for column 'name' at row 1",
        kind: 'sql',
        code: 'ER_DATA_TOO_LONG',
        errno: 1406,
      } satisfies SqlError;
    }) satisfies SaveCell,
  },
  play: async ({ canvasElement }) => {
    // the modal renders in a portal, outside the story's root
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.type(body.getByRole('textbox'), ' and more');
    await userEvent.click(body.getByRole('button', { name: /^Save/ }));

    await expect(
      await body.findByText("Data too long for column 'name' at row 1")
    ).toBeVisible();
    await expect(body.getByText('1406: ER_DATA_TOO_LONG')).toBeVisible();
  },
};

// the cell changed in between, and the server refuses the overwrite: the conflict modal shows why
export const SqlErrorOnOverwrite: Story = {
  args: {
    detail: makeDetail(
      makeColumn('name', FieldKind.String, makeColumnDetail('name')),
      'the value I loaded'
    ),
  },
  parameters: {
    save: (async ({ newValue, force }) => {
      action('save')(newValue, { force });

      if (!force) {
        return {
          status: UpdateCellStatus.Conflict,
          reason: ConflictReason.Changed,
          currentValue: 'what someone else wrote',
        };
      }

      throw {
        name: 'Error',
        message: "Data too long for column 'name' at row 1",
        kind: 'sql',
        code: 'ER_DATA_TOO_LONG',
        errno: 1406,
      } satisfies SqlError;
    }) satisfies SaveCell,
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.type(body.getByRole('textbox'), ' and more');
    await userEvent.click(body.getByRole('button', { name: /^Save/ }));
    await userEvent.click(
      await body.findByRole('button', { name: 'Overwrite' })
    );

    // the modal closes on the click and reopens on the error: it fades in
    await waitFor(() =>
      expect(
        body.getByText("Data too long for column 'name' at row 1")
      ).toBeVisible()
    );
  },
};

/** `article.auteur_id` and `envoi_newsletter (article_une_id, media_une_id)`, as the dev servers list them */
const LE_FIL_KEYS: Array<ForeignKey> = [
  {
    constraintName: 'fk_article_auteur',
    table: 'article',
    column: 'auteur_id',
    referencedDatabase: 'tiana_dev',
    referencedTable: 'auteur',
    referencedColumn: 'id',
  },
  {
    constraintName: 'fk_envoi_media_une',
    table: 'envoi_newsletter',
    column: 'article_une_id',
    referencedDatabase: 'tiana_dev',
    referencedTable: 'article_media',
    referencedColumn: 'article_id',
  },
  {
    constraintName: 'fk_envoi_media_une',
    table: 'envoi_newsletter',
    column: 'media_une_id',
    referencedDatabase: 'tiana_dev',
    referencedTable: 'article_media',
    referencedColumn: 'media_id',
  },
];

const field = (
  table: string,
  name: string,
  kind = FieldKind.String
): ResultField => ({ name, table, kind });

/** auteur 32 and the picture of envoi 13, as `tiana-dev-mysql` answers them */
const LE_FIL_ROWS: Record<string, SelectedRow> = {
  'auteur:32': {
    fields: [
      field('auteur', 'id', FieldKind.Number),
      ...['nom', 'prenom', 'genre', 'initiale', 'email', 'role', 'service'].map(
        (name) => field('auteur', name)
      ),
      field('auteur', 'biographie', FieldKind.Text),
      field('auteur', 'ville'),
      field('auteur', 'arrive_le', FieldKind.Date),
      field('auteur', 'parti_le', FieldKind.Date),
      field('auteur', 'actif', FieldKind.Number),
      field('auteur', 'compte_x'),
    ],
    row: {
      id: 32,
      nom: 'Bourgeois',
      prenom: 'Valerie',
      genre: 'female',
      initiale: 'B',
      email: 'valerie-bourgeois@lefil.fr',
      role: 'redacteur_chef',
      service: 'International',
      biographie:
        "Valerie Bourgeois couvre l'Europe centrale et les Balkans pour Le Fil depuis 2011.",
      ville: 'Grenoble',
      arrive_le: '2011-07-13',
      parti_le: null,
      actif: 1,
      compte_x: null,
    },
  },
  'article_media:9,237': {
    fields: [
      field('article_media', 'article_id', FieldKind.Number),
      field('article_media', 'media_id', FieldKind.Number),
      field('article_media', 'position', FieldKind.Number),
      field('article_media', 'legende_specifique'),
    ],
    row: {
      article_id: 9,
      media_id: 237,
      position: 1,
      legende_specifique: null,
    },
  },
};

/** what `tiana-dev-postgres` answers when `3.5` is compared with an integer column */
const INVALID_INTEGER = {
  name: 'Error',
  message: 'invalid input syntax for type integer: "3.5"',
  kind: 'sql',
  code: '22P02',
  sqlState: '22P02',
} satisfies SqlError;

/** What `window.sql.selectRow` answers in these stories: the rows above, and no row for any other key. */
const selectRow = fn(
  async ({ table, key }: SelectRowRequest): Promise<SelectedRow> => {
    if (key.some(({ value }) => value === '3.5')) {
      throw INVALID_INTEGER;
    }

    const found =
      LE_FIL_ROWS[`${table}:${key.map(({ value }) => value).join(',')}`];

    return found ?? { fields: LE_FIL_ROWS['auteur:32'].fields, row: null };
  }
);

/** Puts the mock in the bridge for one story, and the bridge back after it. */
function answerSelectRow(): () => void {
  const bridge = window.sql;

  selectRow.mockClear();
  window.sql = { ...bridge, selectRow };

  return () => {
    window.sql = bridge;
  };
}

function foreignKeyDetail(
  table: string,
  name: string,
  value: unknown,
  rowByColumn: Record<string, unknown>
): CellDetail {
  const detail = makeDetail(
    {
      ...makeColumn(name, FieldKind.Number, makeColumnDetail(name, { table })),
      tableName: table,
      hasForeignKey: true,
    },
    value
  );

  return { ...detail, rowByColumn };
}

/** The author an article points at, previewed as the key is typed. */
export const ForeignKeyPreview: Story = {
  parameters: { foreignKeys: LE_FIL_KEYS },
  beforeEach: answerSelectRow,
  args: {
    detail: foreignKeyDetail('article', 'auteur_id', 32, {
      id: 4,
      auteur_id: 32,
    }),
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const card = within(await body.findByRole('group', { name: 'Linked row' }));

    // the key itself is left out: its value is in the header already
    await card.findByText('Bourgeois');
    expect(card.getByText('auteur')).toBeTruthy();
    expect(card.getByText('id = 32')).toBeTruthy();
    expect(card.queryByText('email')).toBeNull();

    await userEvent.click(
      card.getByRole('button', { name: 'Show the 9 other columns' })
    );
    expect(card.getByText('valerie-bourgeois@lefil.fr')).toBeTruthy();
    await userEvent.click(card.getByRole('button', { name: 'Collapse' }));
    expect(card.queryByText('email')).toBeNull();

    // one lookup per pause in the typing, not per key
    const input = body.getByRole('spinbutton');
    await userEvent.type(input, '99', {
      initialSelectionStart: 0,
      initialSelectionEnd: 2,
    });
    await card.findByText('No row of auteur has id = 99');
    expect(selectRow.mock.calls.map(([{ key }]) => key[0].value)).toEqual([
      '32',
      '99',
    ]);

    await userEvent.click(body.getByRole('checkbox', { name: 'Set to NULL' }));
    expect(body.queryByRole('group', { name: 'Linked row' })).toBeNull();
  },
};

/** The picture of a newsletter send: the article comes from the row, the picture from the draft. */
export const CompositeForeignKeyPreview: Story = {
  parameters: { foreignKeys: LE_FIL_KEYS },
  beforeEach: answerSelectRow,
  args: {
    detail: foreignKeyDetail('envoi_newsletter', 'media_une_id', 237, {
      id: 13,
      article_une_id: 9,
      media_une_id: 237,
    }),
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const card = within(await body.findByRole('group', { name: 'Linked row' }));

    expect(card.getByText('article_media')).toBeTruthy();
    expect(card.getByText('article_id = 9, media_id = 237')).toBeTruthy();
    await card.findByText('position');
    expect(card.queryByText('article_id')).toBeNull();
    expect(card.queryByRole('button', { name: /Show/ })).toBeNull();
  },
};

/** The server refuses the draft as a key: its error takes the card's place. */
export const ForeignKeyPreviewError: Story = {
  parameters: { foreignKeys: LE_FIL_KEYS },
  beforeEach: answerSelectRow,
  args: {
    detail: foreignKeyDetail('article', 'auteur_id', 32, {
      id: 4,
      auteur_id: 32,
    }),
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const card = within(await body.findByRole('group', { name: 'Linked row' }));

    await card.findByText('Bourgeois');
    await userEvent.type(body.getByRole('spinbutton'), '3.5', {
      initialSelectionStart: 0,
      initialSelectionEnd: 2,
    });

    await expect(
      await card.findByText('invalid input syntax for type integer: "3.5"')
    ).toBeVisible();
    await expect(card.getByText('22P02')).toBeVisible();
    expect(card.queryByText('Bourgeois')).toBeNull();
  },
};
