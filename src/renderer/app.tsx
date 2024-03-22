import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import invariant from 'tiny-invariant';
import Connect from './routes/connect';
import Create from './routes/connect/create';
import Edit from './routes/connect/edit.$connectionSlug';
import ConnectionDetailPage, {
  loader as connectionDetailPageLoader,
} from './routes/connections.$connectionSlug';
import DatabaseDetailPage, {
  loader as databaseDetailPageLoader,
} from './routes/connections.$connectionSlug.$databaseName';
import TableNamePage, {
  loader as tableNamePageLoader,
} from './routes/connections.$connectionSlug.$databaseName.$tableName';
import ConnectionErrorPage from './routes/errors/ConnectionsErrorPage';
import RootErrorPage from './routes/errors/RootErrorPage';
import { Home } from './routes/home';
import Root from './routes/root';
import SqlPage, { action as sqlPageAction } from './routes/sql.$connectionSlug';

const appElement = document.getElementById('App');

invariant(appElement, 'App element not found');

const root = createRoot(appElement);

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
        element: <Home />,
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
      {
        path: 'connections/:connectionSlug',
        loader: connectionDetailPageLoader,
        shouldRevalidate: ({ currentParams, nextParams }) => {
          return currentParams.connectionSlug !== nextParams.connectionSlug;
        },
        element: <ConnectionDetailPage />,
        children: [
          {
            path: ':databaseName',
            loader: databaseDetailPageLoader,
            element: <DatabaseDetailPage />,
            errorElement: <ConnectionErrorPage />,
            children: [
              {
                path: 'tables/:tableName',
                loader: tableNamePageLoader,
                element: <TableNamePage />,
              },
              {
                path: 'sql',
                element: <SqlPage />,
                action: sqlPageAction,
              },
            ],
          },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// root.render(<div>coucou</div>);
