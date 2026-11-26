import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { styled } from 'styled-components';
import FindBar from './FindBar';
import { FindHighlight } from './pageFinder';

const CITIES = Array.from({ length: 40 }, (_, index) =>
  index === 30 ? 'Paris' : `Ville ${index}`
);

/** what the bar listens to the Edit menu's Find with, nothing until it does */
let onFindChosen: (() => void) | undefined;

/** Find chosen in the Edit menu, by a story in place of the main process. */
async function chooseFind(): Promise<void> {
  // the bar listens from an effect, which a built Storybook has not always run when the play starts
  await waitFor(() => expect(onFindChosen).toBeDefined());
  onFindChosen?.();
}

const meta: Meta<typeof FindBar> = {
  component: FindBar,
  beforeEach: () => {
    onFindChosen = undefined;
    // @ts-expect-error a story has no main process to send Find
    window.editMenu = {
      onFind: (callback: () => void) => {
        onFindChosen = callback;

        return () => {};
      },
    };
  },
  decorators: [
    (Story) => (
      <Page>
        <ul>
          <li>Paris</li>
          <li>Lyon</li>
        </ul>
        <Scroller data-testid="scroller">
          <table>
            <thead>
              <tr>
                <th>ville</th>
              </tr>
            </thead>
            <tbody>
              {CITIES.map((city, index) => (
                <tr key={index}>
                  <td>{city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroller>
        <Story />
      </Page>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FindBar>;

function textOf(range: AbstractRange): string {
  const live = document.createRange();

  live.setStart(range.startContainer, range.startOffset);
  live.setEnd(range.endContainer, range.endOffset);

  return live.toString();
}

const highlighted = (name: FindHighlight) =>
  [...(CSS.highlights.get(name) ?? [])].map(textOf);

/** the match is under nothing else: the point at its centre is in it */
function isInView(range: AbstractRange): boolean {
  const element = range.startContainer.parentElement!;
  const { x, y, width, height } = element.getBoundingClientRect();

  return element.contains(
    document.elementFromPoint(x + width / 2, y + height / 2)
  );
}

/** Ctrl+F, a text, Enter to the match out of view, Escape. */
export const FindAndReveal: Story = {
  play: async ({ canvas }) => {
    await userEvent.keyboard('{Control>}f{/Control}');
    const input = await canvas.findByPlaceholderText('Find in page');

    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.type(input, 'PARIS');
    await expect(await canvas.findByText('1 of 2')).toBeInTheDocument();
    await expect(highlighted(FindHighlight.Match)).toEqual(['Paris', 'Paris']);

    const [, outOfView] = CSS.highlights.get(FindHighlight.Match)!;

    await expect(isInView(outOfView)).toBe(false);
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByText('2 of 2')).toBeInTheDocument();
    await expect(isInView(outOfView)).toBe(true);
    await expect([...CSS.highlights.get(FindHighlight.Active)!][0]).toBe(
      outOfView
    );

    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByPlaceholderText('Find in page')).toBeNull();
    await expect(CSS.highlights.size).toBe(0);
  },
};

/** The grid unmounts the row of the active match: the next match takes over. */
export const ActiveMatchRemoved: Story = {
  play: async ({ canvas }) => {
    // outside React's tree, so that the story can remove one
    const added = ['zz1', 'zz2', 'zz3'].map((text) => {
      const paragraph = document.createElement('p');

      paragraph.textContent = text;
      document.body.append(paragraph);

      return paragraph;
    });

    try {
      await userEvent.keyboard('{Control>}f{/Control}');
      await userEvent.type(
        await canvas.findByPlaceholderText('Find in page'),
        'zz'
      );
      await userEvent.keyboard('{Enter}');
      await expect(await canvas.findByText('2 of 3')).toBeInTheDocument();

      added[1].remove();

      await expect(await canvas.findByText('2 of 2')).toBeInTheDocument();
      await expect(highlighted(FindHighlight.Active)).toEqual(['zz']);
      await expect(
        [...CSS.highlights.get(FindHighlight.Active)!][0].startContainer
      ).toBe(added[2].firstChild);
    } finally {
      added.forEach((paragraph) => paragraph.remove());
    }
  },
};

/** Find in the Edit menu, the focus in the page: the bar opens. */
export const FindFromTheMenu: Story = {
  play: async ({ canvas }) => {
    await chooseFind();

    await waitFor(() =>
      expect(canvas.getByPlaceholderText('Find in page')).toHaveFocus()
    );
  },
};

/** Find in the Edit menu, the focus in a SQL editor: its own find opens, not the bar. */
export const FindFromTheMenuInAnEditor: Story = {
  play: async ({ canvas, canvasElement }) => {
    const [monaco] = await Promise.all([
      import('monaco-editor'),
      import('../MonacoEditor/userWorker'),
    ]);
    const container = document.createElement('div');

    container.style.height = '100px';
    canvasElement.append(container);
    const editor = monaco.editor.create(container, { value: 'SELECT 1' });

    try {
      editor.focus();
      await waitFor(() => expect(editor.hasTextFocus()).toBe(true));
      await chooseFind();

      await waitFor(() =>
        expect(document.activeElement?.closest('.find-widget')).not.toBeNull()
      );
      await expect(canvas.queryByPlaceholderText('Find in page')).toBeNull();
    } finally {
      editor.dispose();
      container.remove();
    }
  },
};

const Page = styled.div`
  display: flex;
  gap: 32px;
  height: 240px;
  padding-top: 48px;
`;

const Scroller = styled.div`
  overflow: auto;
  height: 160px;
  width: 240px;

  th {
    position: sticky;
    top: 0;
    background: inherit;
  }
`;
