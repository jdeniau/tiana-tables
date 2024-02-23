import { createRoot } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { styled } from 'styled-components';
import React, { PureComponent } from 'react';
import Root from './routes/root';
import ErrorPage from './error-page';
import { Home } from './routes/home';
import ConnectionPage from './component/Connection/ConnectionPage';
import TableLayout from './component/TableLayout';
import ConnectionForm from './component/Connection/ConnectionForm';
import { Tables } from './routes/tables';

const root = createRoot(document.getElementById('App'));

// A possibility is also to create history manually to call `history.push('/path')`
// import { createMemoryHistory } from 'history';
// export const history = createMemoryHistory();
// <Router history={history}>

const ModalLike = styled.div`
  width: 50%;
  min-width: 400px;
  align-self: center;
`;

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
            element: (
              <ModalLike>
                <ConnectionPage />
              </ModalLike>
            ),
          },
          {
            path: 'create',
            element: (
              <ModalLike>
                <ConnectionForm />
              </ModalLike>
            ),
          },
        ],
      },
      {
        path: 'tables',
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

export class App extends PureComponent {
  render() {
    return <RouterProvider router={router} />;
  }
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// root.render(<div>coucou</div>);
