import * as React from 'react';
import { action } from '@storybook/addon-actions';
// import Cell from '../src/component/Cell';


export default {
  title: 'Cell',
};

export const text = () => (
  <span onClick={action('clicked')}>Hello Button</span>
);

export const emoji = () => (
  <span onClick={action('clicked')}>
    <span role='img' aria-label='so cool'>
      😀 😎 👍 💯
    </span>
  </span>
);
