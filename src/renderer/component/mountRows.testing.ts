import { afterAll, beforeAll } from 'vitest';

/**
 * Gives every element of the suite a height, for the rows of a grid to mount:
 * happy-dom lays nothing out, and the virtualizer mounts the rows that fit in the height of the scroller.
 */
export function mountRows(): void {
  const offsetHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetHeight'
  );

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 600,
    });
  });

  afterAll(() => {
    if (offsetHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetHeight',
        offsetHeight
      );
    }
  });
}
