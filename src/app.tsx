import { createRoot } from 'react-dom/client';
import {
  MemoryRouter as Router,
  RouterProvider,
  createMemoryRouter,
} from 'react-router';
import styled from 'styled-components';
import React, { PureComponent } from 'react';
import Root from './routes/root';
import ErrorPage from './error-page';
import { Home } from './routes/home';
import ConnectionPage from './component/Connection/ConnectionPage';
import ConnectionForm from './component/Connection/ConnectionForm';

const root = createRoot(document.body);

// A possibility is also to create history manually to call `history.push('/path')`
// import { createMemoryHistory } from 'history';
// export const history = createMemoryHistory();
// <Router history={history}>

const RightPanelDiv = styled.div`
  flex-grow: 1;
  overflow: auto;
  padding: 0 10px;
`;
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
