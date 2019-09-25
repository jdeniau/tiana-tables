import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { MemoryRouter as Router } from 'react-router';
import ConnectionForm from '../src/component/Connection/ConnectionForm';
import ConnectionNav from '../src/component/Connection/Nav';
import { ConnectionContext } from '../src/Contexts';
import { createConnection } from 'mysql';

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
      <ConnectionForm />
    </ConnectionContext.Provider>
  );
});

stories.add('Connection nav', () => {
  const stubbedConnection = createConnection({
    host: 'example.org',
    user: 'bob',
    password: 'secret',
  });

  return (
    <Router>
      <ConnectionContext.Provider
        value={{
          currentConnection: null,
          connectionList: [stubbedConnection],
          connectTo: action('connectTo'),
          setCurrentConnection: action('setCurrentConnection'),
        }}
      >
        <ConnectionNav />
      </ConnectionContext.Provider>
    </Router>
  );
});
