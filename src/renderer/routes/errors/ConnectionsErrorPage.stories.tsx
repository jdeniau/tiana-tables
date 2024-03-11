import type { Meta, StoryObj } from '@storybook/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router-dom';
import type { SqlError as SqlErrorType } from '../../../sql/errorSerializer';
import ConnectionsErrorPage from './ConnectionsErrorPage';

type PropsWithError = {
  error: SqlErrorType;
};

function ConnectionsErrorPageWithData({ error }: PropsWithError) {
  // mock `useRouteError` hook
  console.error(error instanceof Error, error);

  const router = createMemoryRouter([
    {
      path: '/',
      errorElement: <ConnectionsErrorPage />,
      loader: () => Promise.reject(error),
    },
  ]);

  return <RouterProvider router={router} />;
}

const meta: Meta<typeof ConnectionsErrorPageWithData> = {
  component: ConnectionsErrorPage,
  render: (args: PropsWithError) => <ConnectionsErrorPageWithData {...args} />,
};

export default meta;

type Story = StoryObj<typeof ConnectionsErrorPage>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const SqlError: Story = {
  args: {
    error: {
      message: 'Unable to connect to the database "test"',
      errno: 42,
      code: 'ERR_SOME_ERROR',
    },
  },
};
