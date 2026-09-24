import { action } from '@storybook/addon-actions';
import type { Preview } from '@storybook/react';
import type { EncryptedConnectionObject } from '../../src/configuration/type';
import { ConnectionContext } from '../../src/contexts/ConnectionContext';
import { DatabaseEngine } from '../../src/sql/engine';

// extract unexposed type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DecoratorFunction = Extract<Preview['decorators'], Array<any>>[number];

/** The connection every story is on: `preview.tsx` puts it in the configuration, where `useDialect` looks it up. */
export const STORY_CONNECTION: EncryptedConnectionObject = {
  name: 'test',
  slug: 'test',
  engine: DatabaseEngine.MySQL,
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
};

/** The app on `STORY_CONNECTION`, for a component that reads the current connection or its dialect. */
const connectionDecorator: DecoratorFunction = (Story) => (
  <ConnectionContext.Provider
    value={{
      currentConnectionSlug: STORY_CONNECTION.slug,
      connectionSlugList: [STORY_CONNECTION.slug],
      addConnectionToList: async (connectionSlug) => {
        action('addConnectionToList')(connectionSlug);
      },
      closeConnection: (connectionSlug) => {
        action('closeConnection')(connectionSlug);
      },
    }}
  >
    <Story />
  </ConnectionContext.Provider>
);

export default connectionDecorator;
