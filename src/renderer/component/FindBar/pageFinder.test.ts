/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FindHighlight, createPageFinder } from './pageFinder';

// happy-dom has none of them, and builds a new `CSS` object on every read
class FakeHighlight extends Set<AbstractRange> {
  priority = 0;

  constructor(...ranges: Array<AbstractRange>) {
    super(ranges);
  }
}

class FakeStaticRange {
  constructor(init: StaticRangeInit) {
    Object.assign(this, init);
  }
}

function textOf(range: AbstractRange): string {
  const live = document.createRange();

  live.setStart(range.startContainer, range.startOffset);
  live.setEnd(range.endContainer, range.endOffset);

  return live.toString();
}

const highlighted = (name: FindHighlight): Array<string> =>
  [...((CSS.highlights.get(name) as FakeHighlight | undefined) ?? [])].map(
    textOf
  );

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));

function setup(html: string) {
  document.body.innerHTML = `${html}<div id="bar">paris</div>`;
  const onChange = vi.fn();
  const finder = createPageFinder(
    () => document.getElementById('bar'),
    onChange
  );

  return { finder, onChange };
}

beforeEach(() => {
  vi.stubGlobal('Highlight', FakeHighlight);
  vi.stubGlobal('StaticRange', FakeStaticRange);
  vi.stubGlobal('CSS', { highlights: new Map() });
  vi.spyOn(document, 'elementFromPoint').mockReturnValue(null);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('find', () => {
  test('matches what Chromium matches, outside the bar and the editor', () => {
    const { finder, onChange } = setup(`
      <p>Publié à Paris</p>
      <p style="display: none">paris</p>
      <div class="monaco-editor"><span>paris</span></div>
      <table><tr><td>un </td><td>an à PARIS</td></tr></table>
    `);

    finder.find('paris');

    expect(highlighted(FindHighlight.Match)).toEqual(['Paris', 'PARIS']);
    expect(highlighted(FindHighlight.Active)).toEqual(['Paris']);
    expect(onChange).toHaveBeenLastCalledWith({ matches: 2, active: 0 });

    finder.find('publie');
    expect(highlighted(FindHighlight.Match)).toEqual(['Publié']);

    finder.find('un an');
    expect(highlighted(FindHighlight.Match)).toEqual(['un an']);
  });

  test('keeps the active match when the text grows', () => {
    const { finder, onChange } = setup('<p>Paris</p><p>pas</p><p>Parme</p>');

    finder.find('pa');
    finder.next();
    finder.next();
    expect(highlighted(FindHighlight.Active)).toEqual(['Pa']);
    expect(onChange).toHaveBeenLastCalledWith({ matches: 3, active: 2 });

    finder.find('par');
    expect(highlighted(FindHighlight.Active)).toEqual(['Par']);
    expect(onChange).toHaveBeenLastCalledWith({ matches: 2, active: 1 });
  });

  test('a text without a match leaves nothing highlighted', () => {
    const { finder, onChange } = setup('<p>Paris</p>');

    finder.find('paris');
    finder.find('parisx');

    expect(CSS.highlights.size).toBe(0);
    expect(onChange).toHaveBeenLastCalledWith({ matches: 0, active: -1 });
  });

  test('clears everything on an empty text', () => {
    const { finder, onChange } = setup('<p>Paris</p>');

    finder.find('paris');
    finder.find('');

    expect(CSS.highlights.size).toBe(0);
    expect(onChange).toHaveBeenLastCalledWith({ matches: 0, active: -1 });
  });

  test('a new search after a clear starts from the first match', () => {
    const { finder, onChange } = setup('<p>Paris</p><p>Parme</p>');

    finder.find('par');
    finder.next();
    finder.clear();
    finder.find('par');

    expect(onChange).toHaveBeenLastCalledWith({ matches: 2, active: 0 });
  });
});

test('next and previous wrap around', () => {
  const { finder, onChange } = setup('<p>a1</p><p>a2</p><p>a3</p>');

  finder.find('a');
  finder.previous();
  expect(onChange).toHaveBeenLastCalledWith({ matches: 3, active: 2 });
  expect(highlighted(FindHighlight.Active)).toEqual(['a']);

  finder.next();
  expect(onChange).toHaveBeenLastCalledWith({ matches: 3, active: 0 });
});

test('the active match is painted over the others', () => {
  const { finder } = setup('<p>Paris</p>');

  finder.find('paris');

  expect(
    (CSS.highlights.get(FindHighlight.Active) as FakeHighlight).priority
  ).toBeGreaterThan(
    (CSS.highlights.get(FindHighlight.Match) as FakeHighlight).priority
  );
});

describe('reveal', () => {
  test('scrolls a covered match to the centre', () => {
    const { finder } = setup('<p>Paris</p><p id="second">Parme</p>');

    finder.find('par');
    finder.next();

    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
      block: 'center',
      inline: 'center',
    });
    expect(
      vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1)
    ).toBe(document.getElementById('second'));
  });

  test('leaves a match in view where it is', () => {
    const { finder } = setup('<p id="first">Paris</p>');
    vi.mocked(document.elementFromPoint).mockReturnValue(
      document.getElementById('first')
    );

    finder.find('paris');

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('follows the page', () => {
  test('finds again once per frame, without scrolling', async () => {
    const { finder, onChange } = setup('<p>Paris</p>');

    finder.find('paris');
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    document.body.insertAdjacentHTML('afterbegin', '<p>paris</p>');
    // the observer is called back once per microtask checkpoint
    await Promise.resolve();
    document.body.insertAdjacentHTML('afterbegin', '<p>paris</p>');
    await nextFrame();
    await nextFrame();

    expect(onChange).toHaveBeenLastCalledWith({ matches: 3, active: 2 });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  test('ignores what changes in the bar', async () => {
    const { finder, onChange } = setup('<p>Paris</p>');

    finder.find('paris');
    document.getElementById('bar')!.textContent = '1 of 1';
    await nextFrame();
    await nextFrame();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('stops once cleared', async () => {
    const { finder, onChange } = setup('<p>Paris</p>');

    finder.find('paris');
    finder.clear();
    document.body.insertAdjacentHTML('afterbegin', '<p>paris</p>');
    await nextFrame();
    await nextFrame();

    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
