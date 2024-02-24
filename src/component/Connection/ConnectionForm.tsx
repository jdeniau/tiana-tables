import { Button, Checkbox, Form, Input } from 'antd';
import {
  ConnectionContext,
  ConnectToFunc,
  useConfiguration,
} from '../../Contexts';
import { ConnectionObject } from './types';
import { PureComponent, useContext } from 'react';
import { NavigateFunction, useNavigate } from 'react-router';

interface ConnectionFormProps {
  connectTo: ConnectToFunc;
  addConnectionToConfig: (connection: ConnectionObject) => void;
  navigate: NavigateFunction;
}
type ConnectionFormType = ConnectionObject & {
  save: boolean;
};

class ConnectionForm extends PureComponent<ConnectionFormProps> {
  constructor(props: ConnectionFormProps) {
    super(props);

    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(formData: ConnectionFormType): void {
    const { addConnectionToConfig } = this.props;
    const { save, ...connection } = formData;

    if (save) {
      addConnectionToConfig(connection);
    }

    this.props.connectTo(connection);
  }

  render() {
    const { navigate } = this.props;

    const initialValues = {
      name: '',
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      save: true,
    };

    return (
      <Form initialValues={initialValues} onFinish={this.handleSubmit}>
        <Form.Item<ConnectionFormType>
          name="name"
          label="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item<ConnectionFormType>
          name="host"
          label="host"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item<ConnectionFormType>
          name="port"
          label="port"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item<ConnectionFormType>
          name="user"
          label="user"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item<ConnectionFormType> name="password" label="password">
          <Input type="password" />
        </Form.Item>

        <Form.Item<ConnectionFormType> name="save" valuePropName="checked">
          <Checkbox>enregistrer la connexion</Checkbox>
        </Form.Item>

        <Form.Item<ConnectionFormType>>
          <Button
            onClick={() => {
              navigate(-1);
            }}
          >
            Cancel
          </Button>
          <Button type="primary" htmlType="submit">
            Connect
          </Button>
        </Form.Item>
      </Form>
    );
  }
}

function ConnectionFormWithContext() {
  const { connectTo } = useContext(ConnectionContext);
  const { addConnectionToConfig } = useConfiguration();
  const navigate = useNavigate();

  return (
    <ConnectionForm
      navigate={navigate}
      connectTo={connectTo}
      addConnectionToConfig={addConnectionToConfig}
    />
  );
}

export default ConnectionFormWithContext;
