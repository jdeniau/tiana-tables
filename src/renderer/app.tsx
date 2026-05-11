import React, { Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Navigate,
  RouteObject,
  RouterProvider,
  createHashRouter,
} from 'react-router-dom';
import invariant from 'tiny-invariant';
import ConnectionErrorPage from './routes/errors/ConnectionsErrorPage';
import RootErrorPage from './routes/errors/RootErrorPage';

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
    lazy: async () => {
      const routeModule = await import('./routes/root');

      return { Component: routeModule.default };
    },
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
            lazy: async () => {
              const routeModule = await import('./routes/connect');

              return { Component: routeModule.default };
            },
          },
          {
            path: 'create',
            lazy: async () => {
              const routeModule = await import('./routes/connect/create');

              return { Component: routeModule.default };
            },
          },
          {
            path: 'edit/:connectionSlug',
            lazy: async () => {
              const routeModule = await import(
                './routes/connect/edit.$connectionSlug'
              );

              return { Component: routeModule.default };
            },
          },
        ],
      },
      {
        path: 'connections/:connectionSlug',
        shouldRevalidate: ({ currentParams, nextParams }) => {
          return (
            currentParams.connectionSlug !== nextParams.connectionSlug ||
            currentParams.databaseName !== nextParams.databaseName
          );
        },
        lazy: async () => {
          const routeModule = await import(
            './routes/connections.$connectionSlug'
          );

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
              const routeModule = await import(
                './routes/connections.$connectionSlug.$databaseName'
              );

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
                      const routeModule = await import(
                        './routes/connections.$connectionSlug.$databaseName.$tableName'
                      );

                      return {
                        loader: routeModule.loader,
                        Component: routeModule.default,
                      };
                    },
                  },
                  {
                    path: 'structure',
                    lazy: async () => {
                      const routeModule = await import(
                        './routes/connections.$connectionSlug.$databaseName.$tableName.structure'
                      );

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
                  const routeModule = await import(
                    './routes/sql.$connectionSlug'
                  );

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
