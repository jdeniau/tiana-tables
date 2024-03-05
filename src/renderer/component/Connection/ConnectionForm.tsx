import { Button, Form, Input } from 'antd';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import type { ConnectionObject } from '../../../sql/types';

type Props = { connection?: ConnectionObject };

function getSubmitButtonLabel(
  t: TFunction,
  connection: ConnectionObject | undefined
): string {
  if (connection) {
    return t('save');
  }

  return t('connection.form.action.saveAndConnect');
}

function ConnectionForm({ connection }: Props) {
  const initialValues: ConnectionObject = connection ?? {
    name: '',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
  };

  const { t } = useTranslation();
  const { connectTo } = useConnectionContext();
  const { addConnectionToConfig, editConnection } = useConfiguration();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSubmit = (formData: ConnectionObject): void => {
    if (connection) {
      // edit connection
      editConnection(connection.name, formData);

      navigate('/connect');
      return;
    }

    addConnectionToConfig(formData);
    connectTo(formData);
  };

  return (
    <Form initialValues={initialValues} onFinish={handleSubmit} form={form}>
      <Form.Item<ConnectionObject>
        name="name"
        label={t('connection.form.name.label')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ConnectionObject>
        name="host"
        label={t('connection.form.host.label')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ConnectionObject>
        name="port"
        label={t('connection.form.port.label')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ConnectionObject>
        name="user"
        label={t('connection.form.user.label')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ConnectionObject>
        name="password"
        label={t('connection.form.password.label')}
      >
        <Input type="password" />
      </Form.Item>

      <Form.Item<ConnectionObject> shouldUpdate>
        <Button
          onClick={() => {
            navigate(-1);
          }}
        >
          {t('cancel')}
        </Button>
        <Button type="primary" htmlType="submit">
          {getSubmitButtonLabel(t, connection)}
        </Button>
      </Form.Item>
    </Form>
  );
}

export default ConnectionForm;
