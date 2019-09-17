import * as React from 'react';
import { ConnectionContext } from '../Contexts';

class ConnectionForm extends React.PureComponent {
  constructor(props) {
    super(props);
    console.log(process.env);
    this.state = {
      host: process.env.DEBUG_DB_HOST,
      port: process.env.DEBUG_DB_PORT,
      user: process.env.DEBUG_DB_USER,
      password: process.env.DEBUG_DB_PASSWORD,
      database: process.env.DEBUG_DB_DATABASE,
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event: Event): void {
    const target = event.target;
    if (!target) {
      return;
    }

    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  }

  handleSubmit(event) {
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

function ConnectionFormWithContext(props) {
  const { connectTo } = React.useContext(ConnectionContext);

  return <ConnectionForm connectTo={connectTo} {...props} />;
}

export default ConnectionFormWithContext;
