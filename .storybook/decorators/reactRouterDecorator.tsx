import type { Preview } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

// extract unexposed type
type DecoratorFunction = Extract<Preview['decorators'], Array<any>>[number];

const reactRouterDecorator: DecoratorFunction = (Story, context) => {
  return (
    <MemoryRouter>
      <Story />
    </MemoryRouter>
  );
};

export default reactRouterDecorator;
