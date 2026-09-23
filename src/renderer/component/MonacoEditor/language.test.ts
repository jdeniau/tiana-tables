/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { DatabaseEngine } from '../../../sql/engine';
import { engineOf, languageOf } from './language';

describe('language', () => {
  it.each(Object.values(DatabaseEngine))(
    'reads the engine %s back from its language',
    (engine) => {
      expect(engineOf(languageOf(engine))).toBe(engine);
    }
  );

  // the cell editor's JSON model must get no SQL validation or completion
  it('knows no engine for a model that is not SQL', () => {
    expect(engineOf('json')).toBeUndefined();
  });
});
