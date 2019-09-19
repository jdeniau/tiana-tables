import * as React from 'react';
import { ConnectionContext, ConnectToFunc } from '../Contexts';

interface ConnectionFormProps {
  connectTo: ConnectToFunc;
}
interface ConnectionFormState {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}
class ConnectionForm extends React.PureComponent<
  ConnectionFormProps,
  ConnectionFormState
> {
  constructor(props: ConnectionFormProps) {
    super(props);
    this.state = {
      host: process.env.DEBUG_DB_HOST || 'localhost',
      port: process.env.DEBUG_DB_PORT
        ? parseInt(process.env.DEBUG_DB_PORT, 10)
        : 3306,
      user: process.env.DEBUG_DB_USER || '',
      password: process.env.DEBUG_DB_PASSWORD || '',
      database: process.env.DEBUG_DB_DATABASE || '',
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const target = event.target;

    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    if (!Object.keys(this.state).includes(name)) {
      throw new Error(
        `Unable to assign state key ${name} as it is not defined in the state`
      );
    }

    // @ts-ignore: name is in state due to previous line
    this.setState({
      [name]: value,
    });
  }

  handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    this.props.connectTo(this.state);
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          host
          <input
            name="host"
            type="text"
            value={this.state.host}
            onChange={this.handleInputChange}
          />
        </label>
        <label>
          port
          <input
            name="port"
            type="number"
            value={this.state.port}
            onChange={this.handleInputChange}
          />
        </label>
        <label>
          user
          <input
            name="user"
            type="text"
            value={this.state.user}
            onChange={this.handleInputChange}
          />
        </label>
        <label>
          password
          <input
            name="password"
            type="text"
            value={this.state.password}
            onChange={this.handleInputChange}
          />
        </label>
        <label>
          database
          <input
            name="database"
            type="text"
            value={this.state.database}
            onChange={this.handleInputChange}
          />
        </label>
        <div>
          <input type="submit" value="connect" />
        </div>
      </form>
    );
  }
}

function ConnectionFormWithContext() {
  const { connectTo } = React.useContext(ConnectionContext);

  return <ConnectionForm connectTo={connectTo} />;
}

export default ConnectionFormWithContext;
