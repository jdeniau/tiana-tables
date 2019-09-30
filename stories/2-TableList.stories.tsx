import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { stubInterface } from 'ts-sinon';
import { MemoryRouter as Router } from 'react-router';
import { Connection, Query, queryCallback } from 'mysql';
import TableList from '../src/component/TableList';
import { ConnectionContext } from '../src/Contexts';

const stories = storiesOf('Table list', module);

stories.add('Table List', () => {
  const stubbedConnection = stubInterface<Connection>();

  stubbedConnection.query.callsFake(
    (option: string, callback: queryCallback) => {
      console.table({ option, callback });
      switch (option) {
        case 'SHOW TABLE STATUS FROM `ticketing`;':
          callback(null, [{ Name: 'foo' }, { Name: 'bar' }, { Name: 'baz' }]);
          break;
      }
      return stubInterface<Query>();
    }
  );

  return (
    <Router>
      <ConnectionContext.Provider
        value={{
          currentConnection: stubbedConnection,
          connectionList: [stubbedConnection],
          connectTo: () => {},
          setCurrentConnection: () => {},
        }}
      >
        <TableList />
      </ConnectionContext.Provider>
    </Router>
  );
});
