import { createRoot } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router';
import React from 'react';
import Root from './routes/root';
import ErrorPage from './error-page';
import { Home } from './routes/home';
import TableLayout from './component/TableLayout';
import { Tables } from './routes/tables';
import Connect from './routes/connect';
import Create from './routes/connect/create';
import Edit from './routes/connect/edit.$connectionName';

const root = createRoot(document.getElementById('App'));

// A possibility is also to create history manually to call `history.push('/path')`
// import { createMemoryHistory } from 'history';
// export const history = createMemoryHistory();
// <Router history={history}>

const router = createMemoryRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />,
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
            path: 'edit/:connectionName',
            element: <Edit />,
          },
        ],
      },
      {
        path: 'connections/:connectionName',
        element: <Tables />,
      },
      {
        path: 'connections/:connectionName/:databaseName',
        element: <Tables />,
        children: [
          {
            path: ':tableName',
            element: <TableLayout />,
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
