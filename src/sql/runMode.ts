/** What the SQL page sends when the user asks for the editor to be run. */
export enum RunMode {
  /** the statement the caret sits in */
  Current = 'current',
  /** every statement of the editor, in order */
  All = 'all',
}

const RUN_MODES = Object.values(RunMode);

/** The mode a form field or a menu key names, `undefined` when it names none. */
export function toRunMode(value: unknown): RunMode | undefined {
  return RUN_MODES.find((mode) => mode === value);
}
