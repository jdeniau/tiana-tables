import * as React from 'react';
import { ConnectionContext, ConnectToFunc } from '../../Contexts';
import storage from './SavedConnections';
import { ConnectionObject } from '.';

interface ConnectionFormProps {
  connectTo: ConnectToFunc;
}
type ConnectionFormState = ConnectionObject & {
  save: boolean;
};

class ConnectionForm extends React.PureComponent<
  ConnectionFormProps,
  ConnectionFormState
> {
  constructor(props: ConnectionFormProps) {
    super(props);
    this.state = {
      name: '',
      save: true,
      host: process.env.DEBUG_DB_HOST || 'localhost',
      port: process.env.DEBUG_DB_PORT
        ? parseInt(process.env.DEBUG_DB_PORT, 10)
        : 3306,
      user: process.env.DEBUG_DB_USER || '',
      password: process.env.DEBUG_DB_PASSWORD || '',
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

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore: name is in state due to previous line
    this.setState({
      [name]: value,
    });
  }

  handleSubmit(event: React.FormEvent) {
    const { save, ...connection } = this.state;
    event.preventDefault();

    if (save) {
      storage.set(connection.name, connection);
    }

    this.props.connectTo(connection);
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <div className="form-group">
          <label htmlFor="Connection__name">name</label>
          <input
            id="Connection__name"
            name="name"
            type="text"
            className="form-control"
            value={this.state.name}
            onChange={this.handleInputChange}
          />
        </div>
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
            type="password"
            className="form-control"
            value={this.state.password}
            onChange={this.handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="Connection__save">enregistrer la connexion</label>
          <input
            id="Connection__save"
            name="save"
            type="checkbox"
            className="form-control"
            checked={this.state.save}
            onChange={this.handleInputChange}
          />
        </div>

        <button className="btn btn-primary" type="submit">
          Connect
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
