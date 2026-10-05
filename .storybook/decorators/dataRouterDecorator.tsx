import { ReactNode, createContext, use, useState } from 'react';
import type { Preview } from '@storybook/react-vite';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

// extract unexposed type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DecoratorFunction = Extract<Preview['decorators'], Array<any>>[number];

/**
 * A data router, where `reactRouterDecorator` gives a plain `MemoryRouter`.
 *
 * The data hooks — `useNavigation`, `useRevalidator`, `useRouteError` — throw
 * outside one, so a component that reads the router's pending state needs this
 * decorator instead. It is also closer to the app, which runs on
 * `createHashRouter`.
 *
 * `/connections/:connectionSlug` is answered by a loader that never resolves:
 * clicking a connection leaves the story in its pending state, which is the
 * state worth looking at — and what a server that never answers does.
 */
type Story = Parameters<DecoratorFunction>[0];

const StoryContext = createContext<ReactNode>(null);

function CurrentStory() {
  return use(StoryContext);
}

function DataRouter({ Story }: { Story: Story }) {
  // The story reaches the route through a context, and the router is built
  // once: rebuilding it on a re-render would send the story back to its
  // initial location, losing the very pending state it is here to show.
  const [router] = useState(() =>
    createMemoryRouter([
      {
        path: '/connections/:connectionSlug',
        loader: () => new Promise(() => {}),
        Component: () => null,
      },
      { path: '*', Component: CurrentStory },
    ])
  );

  return (
    <StoryContext value={<Story />}>
      <RouterProvider router={router} />
    </StoryContext>
  );
}

const dataRouterDecorator: DecoratorFunction = (Story) => (
  <DataRouter Story={Story} />
);

export default dataRouterDecorator;
