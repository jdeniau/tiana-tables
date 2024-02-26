import { Button, Checkbox, Form, Input } from 'antd';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../contexts/ConnectionContext';
import { ConnectionObject } from './types';
import { useNavigate } from 'react-router';

type ConnectionFormType = ConnectionObject & {
  save?: boolean;
};

type Props = { connection?: ConnectionObject };

function ConnectionForm({ connection }: Props) {
  const { connectTo } = useConnectionContext();
  const { addConnectionToConfig, editConnection } = useConfiguration();
  const navigate = useNavigate();

  const handleSubmit = (formData: ConnectionFormType): void => {
    const { save, ...connectionFormData } = formData;

    if (connection) {
      // edit connection
      editConnection(connection.name, connectionFormData);

      navigate('/connect');
      return;
    }

    if (save) {
      addConnectionToConfig(connectionFormData);
    }

    connectTo(connectionFormData);
  };

  const initialValues: ConnectionFormType = connection ?? {
    name: '',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    save: true,
  };

  return (
    <Form initialValues={initialValues} onFinish={handleSubmit}>
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

      {!connection && (
        <Form.Item<ConnectionFormType> name="save" valuePropName="checked">
          <Checkbox>enregistrer la connexion</Checkbox>
        </Form.Item>
      )}

      <Form.Item<ConnectionFormType>>
        <Button
          onClick={() => {
            navigate(-1);
          }}
        >
          Cancel
        </Button>
        <Button type="primary" htmlType="submit">
          {connection ? 'Save' : 'Connect'}
        </Button>
      </Form.Item>
    </Form>
  );
}

export default ConnectionForm;
