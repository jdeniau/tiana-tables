import * as React from 'react';
import { ConnectionContext, ConnectToFunc } from '../../Contexts';

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
        <div className="form-group">
          <label htmlFor="Connection__host">host</label>
          <input
            id="Connection__host"
            name="host"
            type="text"
            className="form-control"
            value={this.state.host}
            onChange={this.handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="Connection__port">port</label>
          <input
            id="Connection__port"
            name="port"
            type="number"
            className="form-control"
            value={this.state.port}
            onChange={this.handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="Connection__user">user</label>
          <input
            id="Connection__user"
            name="user"
            type="text"
            className="form-control"
            value={this.state.user}
            onChange={this.handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="Connection__password">password</label>
          <input
            id="Connection__password"
            name="password"
            type="text"
            className="form-control"
            value={this.state.password}
            onChange={this.handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="Connection__database">database</label>
          <input
            id="Connection__database"
            name="database"
            type="text"
            className="form-control"
            value={this.state.database}
            onChange={this.handleInputChange}
          />
        </div>

        <button className="btn btn-primary" type="submit">
          connect
        </button>
      </form>
    );
  }
}

function ConnectionFormWithContext() {
  const { connectTo } = React.useContext(ConnectionContext);

  return <ConnectionForm connectTo={connectTo} />;
}

export default ConnectionFormWithContext;
