/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import {
  handleSelectAllKey,
  registerSelectAllRows,
  selectAllFromMenu,
} from './selectAll';

const execCommand = vi.fn(() => true);
const unregisters: Array<() => void> = [];

beforeAll(() => {
  document.execCommand = execCommand;
  // happy-dom lays nothing out: a grid is on screen unless `hidden`
  HTMLElement.prototype.checkVisibility = function (this: HTMLElement) {
    return !this.hidden;
  };
});

afterEach(() => {
  execCommand.mockClear();
  unregisters.splice(0).forEach((unregister) => unregister());
  document.body.replaceChildren();
});

function grid({ hidden = false } = {}): () => void {
  const element = document.createElement('div');
  element.hidden = hidden;
  document.body.append(element);
  const selectRows = vi.fn();
  unregisters.push(registerSelectAllRows(element, selectRows));

  return selectRows;
}

function focus(html: string): void {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  host.querySelector<HTMLElement>('[data-focus]')?.focus();
}

function ctrlA(init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'a',
    ctrlKey: true,
    cancelable: true,
    ...init,
  });
  handleSelectAllKey(event);

  return event;
}

describe("the Edit menu's Select All", () => {
  test('selects the rows of the grid on screen, whatever outside text has the focus', () => {
    const selectRows = grid();
    focus('<button data-focus>Menu</button>');

    selectAllFromMenu();

    expect(selectRows).toHaveBeenCalledOnce();
    expect(execCommand).not.toHaveBeenCalled();
  });

  test.each([
    ['an input', '<input data-focus>'],
    [
      'the SQL editor',
      '<div class="monaco-editor"><div tabindex="0" data-focus></div></div>',
    ],
    ['a dialog', '<div role="dialog"><button data-focus>OK</button></div>'],
  ])('leaves %s its native selection', (_, html) => {
    const selectRows = grid();
    focus(html);

    selectAllFromMenu();

    expect(selectRows).not.toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('selectAll');
  });

  test('passes over a hidden grid, and selects the text when none is on screen', () => {
    const hidden = grid({ hidden: true });
    const shown = grid();

    selectAllFromMenu();
    expect(hidden).not.toHaveBeenCalled();
    expect(shown).toHaveBeenCalledOnce();

    unregisters.pop()?.();
    selectAllFromMenu();
    expect(execCommand).toHaveBeenCalledWith('selectAll');
  });
});

describe('Ctrl/Cmd+A', () => {
  test('selects the rows on screen, in place of the page', () => {
    const selectRows = grid();

    expect(ctrlA().defaultPrevented).toBe(true);
    expect(ctrlA({ ctrlKey: false, metaKey: true }).defaultPrevented).toBe(
      true
    );
    expect(selectRows).toHaveBeenCalledTimes(2);
  });

  test('leaves alone a text field, another shortcut, and a key already handled', () => {
    const selectRows = grid();

    expect(ctrlA({ shiftKey: true }).defaultPrevented).toBe(false);

    const handled = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      cancelable: true,
    });
    handled.preventDefault();
    handleSelectAllKey(handled);

    focus('<input data-focus>');
    expect(ctrlA().defaultPrevented).toBe(false);
    expect(selectRows).not.toHaveBeenCalled();
  });
});
