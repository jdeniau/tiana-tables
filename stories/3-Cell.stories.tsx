import { storiesOf } from '@storybook/react';
import { withKnobs, date, number, text, object } from '@storybook/addon-knobs';
import { Types } from 'mysql2';
import Cell from '../src/component/Cell';

const stories = storiesOf('Cell', module);

stories.addDecorator(withKnobs);

stories.add('with NULL value', () => (
  <Cell type={Types.VARCHAR} value={null} />
));

stories.add('with string type', () => (
  <Cell type={Types.VARCHAR} value={text('VARCHAR', 'VARCHAR value')} />
));

stories.add('with number type', () => (
  <Cell type={Types.FLOAT} value={number('FLOAT', 123.45)} />
));

stories.add('with date type', () => {
  const defaultDate = new Date('Jan 20 2020');
  const dateString = date('DATETIME', defaultDate);

  return <Cell type={Types.DATETIME} value={new Date(dateString)} />;
});

stories.add('with blob type', () => (
  <Cell type={Types.BLOB} value={text('BLOB', 'BLOB value')} />
));

stories.add('with JSON type', () => {
  const label = 'Styles';
  const defaultValue = {
    backgroundColor: 'red',
  };

  return (
    <Cell
      type={Types.JSON}
      value={JSON.stringify(object(label, defaultValue))}
    />
  );
});

stories.add('with ENUM/SET type', () => (
  <Cell type={Types.ENUM} value={text('ENUM', 'ENUM value')} />
));
