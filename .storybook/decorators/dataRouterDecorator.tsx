import { useRef, useState } from 'react';
import type { Preview } from '@storybook/react';
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
type Props = { Story: Parameters<DecoratorFunction>[0] };

function DataRouter({ Story }: Props) {
  // The story is read through a ref, and the router built once: rebuilding it
  // on a re-render would send the story back to its initial location, losing
  // the very pending state it is here to show.
  const storyRef = useRef(Story);
  storyRef.current = Story;

  const [router] = useState(() =>
    createMemoryRouter([
      {
        path: '/connections/:connectionSlug',
        loader: () => new Promise(() => {}),
        Component: () => null,
      },
      {
        path: '*',
        Component: () => {
          const CurrentStory = storyRef.current;

          return <CurrentStory />;
        },
      },
    ])
  );

  return <RouterProvider router={router} />;
}

const dataRouterDecorator: DecoratorFunction = (Story) => (
  <DataRouter Story={Story} />
);

export default dataRouterDecorator;
