import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { MemoryRouter as Router } from 'react-router';
import { stubInterface } from 'ts-sinon';
import ConnectionForm from '../src/component/Connection/ConnectionForm';
import ConnectionNav from '../src/component/Connection/Nav';
import { ConnectionContext } from '../src/Contexts';
import { Connection } from 'mysql';

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
        connectTo: (connection: Connection) => {
          action('connectTo')(connection.config);
        },
        setCurrentConnection: action('setCurrentConnection'),
      }}
    >
      <ConnectionForm />
    </ConnectionContext.Provider>
  );
});

stories.add('Connection nav', () => {
  const stubbedConnection = stubInterface<Connection>();
  stubbedConnection.config = {
    host: 'foo.bar',
  };
  const stubbedConnection2 = stubInterface<Connection>();
  stubbedConnection2.config = {
    host: 'mysql.baz',
  };

  return (
    <Router>
      <ConnectionContext.Provider
        value={{
          currentConnection: stubbedConnection2,
          connectionList: [stubbedConnection, stubbedConnection2],
          connectTo: action('connectTo'),
          setCurrentConnection: (connection: Connection) => {
            action('setCurrentConnection')(connection.config);
          },
        }}
      >
        <ConnectionNav />
      </ConnectionContext.Provider>
    </Router>
  );
});
