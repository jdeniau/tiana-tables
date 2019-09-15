import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Types } from 'mysql';
import Cell from '../src/component/Cell';


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

storiesOf('Cell', module)
  .add('with VARCHAR', () => (
    <Cell type={Types.VARCHAR} value='SQL Value' />
  ))
  .add('with DATETIME', () => (
    <Cell type={Types.DATETIME} value={new Date()} />
  ));