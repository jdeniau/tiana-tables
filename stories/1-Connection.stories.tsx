import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import Connection from '../src/component/Connection/ConnectionForm';
import { ConnectionContext } from '../src/Contexts';

const stories = storiesOf('Connection Block', module);

// stories.addDecorator(story => (
//   <div style={{ width: '100px', margin: 'auto', background: 'red' }}>
//     {story()}
//   </div>
// ));

stories.add('Connection Block', () => {
  return (
    <ConnectionContext.Provider
      value={{
        currentConnection: null,
        connectionList: [],
        connectTo: action('connectTo'),
        setCurrentConnection: action('setCurrentConnection'),
      }}
    >
      <Connection />
    </ConnectionContext.Provider>
  );
});
