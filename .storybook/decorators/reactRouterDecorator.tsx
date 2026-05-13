import type { Preview } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

// extract unexposed type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DecoratorFunction = Extract<Preview['decorators'], Array<any>>[number];

const reactRouterDecorator: DecoratorFunction = (Story) => {
  return (
    <MemoryRouter>
      <Story />
    </MemoryRouter>
  );
};

export default reactRouterDecorator;
