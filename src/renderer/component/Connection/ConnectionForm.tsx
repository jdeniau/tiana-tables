import { useNavigate } from 'react-router';
import { Button, Checkbox, Form, Input } from 'antd';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';
import { useTranslation } from '../../../i18n';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import type { ConnectionObject } from '../../../sql/types';

type ConnectionFormType = ConnectionObject & {
  save?: boolean;
};

type Props = { connection?: ConnectionObject };

function getSubmitButtonLabel(
  t: TFunction,
  connection: ConnectionObject | undefined,
  isSaveChecked: boolean | undefined
): string {
  if (connection) {
    return t('save');
  }

  return isSaveChecked
    ? t('connection.form.action.saveAndConnect')
    : t('connection.form.action.connect');
}

function ConnectionForm({ connection }: Props) {
  const initialValues: ConnectionFormType = connection ?? {
    name: '',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    save: true,
  };

  const { t } = useTranslation();
  const { connectTo } = useConnectionContext();
  const { addConnectionToConfig, editConnection } = useConfiguration();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitButtonLabel, setSubmitButtonLabel] = useState<string>(
    getSubmitButtonLabel(t, connection, initialValues.save)
  );

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

  return (
    <Form initialValues={initialValues} onFinish={handleSubmit} form={form}>
      <Form.Item<ConnectionFormType>
        name="name"
        label={t('connection.form.name.label')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ConnectionFormType>
        name="host"
        label={t('connection.form.host.label')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ConnectionFormType>
        name="port"
        label={t('connection.form.port.label')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ConnectionFormType>
        name="user"
        label={t('connection.form.user.label')}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ConnectionFormType>
        name="password"
        label={t('connection.form.password.label')}
      >
        <Input type="password" />
      </Form.Item>

      {!connection && (
        <Form.Item<ConnectionFormType> name="save" valuePropName="checked">
          <Checkbox
            onChange={() => {
              setSubmitButtonLabel(
                getSubmitButtonLabel(t, connection, form.getFieldValue('save'))
              );
            }}
          >
            {t('connection.form.saveConnection')}
          </Checkbox>
        </Form.Item>
      )}

      <Form.Item<ConnectionFormType> shouldUpdate>
        <Button
          onClick={() => {
            navigate(-1);
          }}
        >
          {t('cancel')}
        </Button>
        <Button type="primary" htmlType="submit">
          {submitButtonLabel}
        </Button>
      </Form.Item>
    </Form>
  );
}

export default ConnectionForm;
