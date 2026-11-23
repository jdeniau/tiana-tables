import Mark from 'advanced-mark.js';

/** The names the matches are registered under in `CSS.highlights`, styled with `::highlight()`. */
export enum FindHighlight {
  Match = 'find-match',
  Active = 'find-active',
}

export interface FoundInPage {
  /** the matches shown in the page */
  matches: number;
  /** 0-based, -1 without a match */
  active: number;
}

export interface PageFinder {
  /** finds `query`, keeping the active match where it was; an empty query clears */
  find: (query: string) => void;
  next: () => void;
  previous: () => void;
  /** clears the highlights and stops following the page */
  clear: () => void;
}

export const NOTHING_FOUND: FoundInPage = { matches: 0, active: -1 };

// the editor has its own find; its lines are spans the page would match
const EXCLUDED = ['.monaco-editor', '.monaco-editor *', 'script', 'style'];

const isShown = (node: Text): boolean =>
  node.parentElement?.checkVisibility({
    visibilityProperty: true,
    opacityProperty: true,
  }) ?? false;

function markRanges(query: string, skipped: Node | null): Array<AbstractRange> {
  const ranges: Array<AbstractRange> = [];

  // advanced-mark.js registers a new highlight only when it found something
  CSS.highlights.delete(FindHighlight.Match);
  new Mark(document.body).mark(query, {
    highlight: new Highlight(),
    highlightName: FindHighlight.Match,
    // Chromium's find ignores case and accents, and matches across elements
    caseSensitive: false,
    diacritics: true,
    acrossElements: true,
    separateWordSearch: false,
    exclude: EXCLUDED,
    filter: (nodeOrArray) =>
      [nodeOrArray]
        .flat()
        .every((node) => isShown(node) && !skipped?.contains(node)),
    // static ranges: the document updates every live one on each mutation
    each: (range) => {
      if (!(range instanceof Element)) {
        ranges.push(range);
      }
    },
  });

  return ranges;
}

/** the first range starting at or after `anchor`, wrapping to the first one */
function indexFrom(ranges: Array<AbstractRange>, anchor: Range | null): number {
  if (ranges.length === 0) {
    return -1;
  }

  const index = anchor
    ? ranges.findIndex(
        (range) =>
          anchor.comparePoint(range.startContainer, range.startOffset) >= 0
      )
    : 0;

  return Math.max(index, 0);
}

/** scrolls a match into the middle of its scrollers when something covers it */
function reveal(range: AbstractRange): void {
  const element = range.startContainer.parentElement;

  if (!element) {
    return;
  }

  const { x, y, width, height } = element.getBoundingClientRect();
  const hit = document.elementFromPoint(x + width / 2, y + height / 2);

  // a sticky header or a pinned column covers it, or it is out of view
  if (!hit || !element.contains(hit)) {
    element.scrollIntoView({ block: 'center', inline: 'center' });
  }
}

/**
 * Finds a text in what the page shows, and follows the page as it changes:
 * the grid mounts and unmounts rows while it scrolls.
 */
export function createPageFinder(
  /** the find bar, whose own text is never a match */
  skipped: () => Node | null,
  onChange: (found: FoundInPage) => void
): PageFinder {
  let query = '';
  let ranges: Array<AbstractRange> = [];
  let active = -1;
  // a live range: it stays in the page when the grid unmounts the match's row
  let anchor: Range | null = null;
  let observer: MutationObserver | null = null;
  let frame = 0;

  const show = (revealActive: boolean) => {
    const range = ranges[active];

    if (range) {
      const highlight = new Highlight(range);

      anchor = document.createRange();
      anchor.setStart(range.startContainer, range.startOffset);

      highlight.priority = 1;
      CSS.highlights.set(FindHighlight.Active, highlight);

      if (revealActive) {
        reveal(range);
      }
    } else {
      CSS.highlights.delete(FindHighlight.Active);
    }

    onChange({ matches: ranges.length, active });
  };

  const search = (revealActive: boolean) => {
    ranges = markRanges(query, skipped());
    active = indexFrom(ranges, anchor);
    show(revealActive);
  };

  const follow = () => {
    observer ??= new MutationObserver((records) => {
      const bar = skipped();

      if (frame || records.every((record) => bar?.contains(record.target))) {
        return;
      }

      frame = requestAnimationFrame(() => {
        frame = 0;
        search(false);
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      // what hides a text without removing it
      attributeFilter: ['class', 'style', 'hidden'],
    });
  };

  const clear = () => {
    observer?.disconnect();
    observer = null;
    cancelAnimationFrame(frame);
    frame = 0;
    query = '';
    ranges = [];
    anchor = null;
    CSS.highlights.delete(FindHighlight.Match);
    CSS.highlights.delete(FindHighlight.Active);
    onChange(NOTHING_FOUND);
  };

  const move = (step: number) => {
    if (ranges.length > 0) {
      active = (active + step + ranges.length) % ranges.length;
      show(true);
    }
  };

  return {
    find: (text) => {
      if (!text) {
        clear();

        return;
      }

      query = text;
      search(true);
      follow();
    },
    next: () => move(1),
    previous: () => move(-1),
    clear,
  };
}
