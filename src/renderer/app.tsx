import React, { Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Navigate,
  RouteObject,
  RouterProvider,
  createHashRouter,
} from 'react-router-dom';
import invariant from 'tiny-invariant';
import Connect from './routes/connect';
import Create from './routes/connect/create';
import Edit from './routes/connect/edit.$connectionSlug';
import ConnectionErrorPage from './routes/errors/ConnectionsErrorPage';
import RootErrorPage from './routes/errors/RootErrorPage';
import Root from './routes/root';

const appElement = document.getElementById('App');

invariant(appElement, 'App element not found');

const root = createRoot(appElement);

function logRendererStartupMilestone(name: string): void {
  console.info(
    `[startup][renderer] ${name}: +${Math.round(performance.now())}ms`
  );
}
// A possibility is also to create history manually to call `history.push('/path')`
// import { createMemoryHistory } from 'history';
// export const history = createMemoryHistory();
// <Router history={history}>

const router = createHashRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <RootErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/connect" replace />,
      },
      {
        path: 'connect',
        children: [
          {
            index: true,
            element: <Connect />,
          },
          {
            path: 'create',
            element: <Create />,
          },
          {
            path: 'edit/:connectionSlug',
            element: <Edit />,
          },
        ],
      },
      // The `connections/*` and `sql/*` subtrees stay lazy on purpose: they pull
      // in TableGrid (~515 KB) and Monaco (~3 MB of editor + workers), which we
      // do not want in the initial bundle. The startup path is `/` → `/connect`,
      // so these chunks only load once the user opens a connection — and the
      // MySQL handshake masks the chunk fetch.
      //
      // React Router 7 in framework mode would handle this automatically with
      // smarter pre-fetching; revisit if/when we migrate from RR 6.
      {
        path: 'connections/:connectionSlug',
        shouldRevalidate: ({ currentParams, nextParams }) => {
          return (
            currentParams.connectionSlug !== nextParams.connectionSlug ||
            currentParams.databaseName !== nextParams.databaseName
          );
        },
        lazy: async () => {
          const routeModule =
            await import('./routes/connections.$connectionSlug');

          return {
            loader: routeModule.loader,
            Component: routeModule.default,
          };
        },
        children: [
          {
            path: ':databaseName',
            errorElement: <ConnectionErrorPage />,
            lazy: async () => {
              const routeModule =
                await import('./routes/connections.$connectionSlug.$databaseName');

              return {
                loader: routeModule.loader,
                Component: routeModule.default,
              };
            },
            children: [
              {
                path: 'tables/:tableName',
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const routeModule =
                        await import('./routes/connections.$connectionSlug.$databaseName.$tableName');

                      return {
                        loader: routeModule.loader,
                        Component: routeModule.default,
                      };
                    },
                  },
                  {
                    path: 'structure',
                    lazy: async () => {
                      const routeModule =
                        await import('./routes/connections.$connectionSlug.$databaseName.$tableName.structure');

                      return {
                        loader: routeModule.loader,
                        Component: routeModule.default,
                      };
                    },
                  },
                ],
              },
              {
                path: 'sql',
                lazy: async () => {
                  const routeModule =
                    await import('./routes/sql.$connectionSlug');

                  return {
                    action: routeModule.action,
                    Component: routeModule.default,
                  };
                },
              },
            ],
          },
        ],
      },
    ],
  },
] as RouteObject[]);

export function App() {
  useEffect(() => {
    logRendererStartupMilestone('router-mounted');

    requestAnimationFrame(() => {
      logRendererStartupMilestone('first-animation-frame');
    });
  }, []);

  return (
    <Suspense fallback={null}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

logRendererStartupMilestone('app-entry');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
