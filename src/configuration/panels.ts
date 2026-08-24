/**
 * The resizable panels whose size is remembered across restarts.
 *
 * Sizes are stored globally (not per connection nor per database): they
 * describe the shape of the window, not the data being browsed.
 */
export enum PANEL {
  /** left column listing the tables of the current database */
  TABLE_LIST = 'tableList',
  /** filter zone above the rows, on a table page */
  TABLE_FILTERS = 'tableFilters',
  /** query editor above the results, on the SQL page */
  SQL_EDITOR = 'sqlEditor',
}

/** pixels, used on the first run only — until the panel has been dragged once */
export const DEFAULT_PANEL_SIZES: Record<PANEL, number> = {
  [PANEL.TABLE_LIST]: 200,
  [PANEL.TABLE_FILTERS]: 90,
  [PANEL.SQL_EDITOR]: 320,
};

/** pixels; antd turns them into a ratio of the current container */
export const MIN_PANEL_SIZES: Record<PANEL, number> = {
  [PANEL.TABLE_LIST]: 120,
  [PANEL.TABLE_FILTERS]: 60,
  [PANEL.SQL_EDITOR]: 80,
};

/**
 * A panel never takes more than this share of its splitter, so the panel it is
 * paired with always keeps a visible, usable part of the window.
 */
export const MAX_PANEL_PERCENT = 80;

const PERCENT = /^(\d+(?:\.\d+)?)%$/;

/** rounds to 0.1% — enough precision for a layout, and a readable config file */
export function formatPanelSize(percent: number): string {
  const bounded = Math.min(Math.max(percent, 0), MAX_PANEL_PERCENT);

  return `${Math.round(bounded * 10) / 10}%`;
}

/**
 * Reads a stored size back, or `undefined` when it cannot be trusted.
 *
 * The unit is part of the stored value on purpose: a bare number was written
 * by an earlier build, in pixels, and a pixel count replayed as a percentage
 * blows the panel up to the whole splitter — leaving nothing for its sibling.
 * Anything that is not a percentage is ignored, which sends the panel back to
 * its default instead of to a broken layout.
 */
export function parsePanelSize(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const percent = PERCENT.exec(value)?.[1];

  if (percent === undefined) {
    return undefined;
  }

  return formatPanelSize(Number(percent));
}
