import { Button, Flex, Form, Input } from 'antd';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';
import type {
  ConnectionObject,
  ConnectionObjectWithoutSlug,
} from '../../../sql/types';
import { space } from '../../theme';
import { ActionButton } from '../Style/ActionButton';
import {
  FramedRegion,
  FramedRegionBody,
  RegionHeader,
  RegionName,
} from '../Style/Region';

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

/** labels read as meta text: caps, like the column heads */
const LABEL = { letterSpacing: '0.1em', textTransform: 'uppercase' } as const;

/** the groups own the spacing, so an item drops its own bottom margin */
const ITEM = { marginBottom: 0 } as const;
const PORT = { ...ITEM, width: 96 } as const;

function ConnectionForm({ connection }: Props) {
  const initialValues: ConnectionObjectWithoutSlug = connection ?? {
    name: '',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
  };

  const { t } = useTranslation();
  const { configuration, addConnectionToConfig, editConnection } =
    useConfiguration();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // on a first launch there is nowhere to go back to
  const canCancel =
    connection !== undefined ||
    Object.keys(configuration.connections).length > 0;

  const handleSubmit = (formData: ConnectionObjectWithoutSlug): void => {
    if (connection) {
      // edit connection
      editConnection(connection.slug, formData);

      navigate('/connect');
      return;
    }

    addConnectionToConfig(formData);

    navigate(`/connections/${formData.name}`);
  };

  return (
    <FramedRegion>
      <RegionHeader>
        <RegionName>
          {connection
            ? t('connection.form.title.edit', { name: connection.name })
            : t('connection.form.title.create')}
        </RegionName>
      </RegionHeader>

      <FramedRegionBody>
        <Form
          layout="vertical"
          requiredMark={false}
          styles={{ label: LABEL }}
          initialValues={initialValues}
          onFinish={handleSubmit}
          form={form}
        >
          {/* field groups 24px apart, fields 8px apart within a group */}
          <Flex vertical gap={space.xl}>
            <Form.Item
              name="name"
              label={t('connection.form.name.label')}
              rules={[{ required: true }]}
              style={ITEM}
            >
              <Input />
            </Form.Item>

            <Flex gap={space.sm}>
              <Form.Item
                name="host"
                label={t('connection.form.host.label')}
                rules={[{ required: true }]}
                style={{ ...ITEM, flex: 1 }}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="port"
                label={t('connection.form.port.label')}
                rules={[{ required: true }]}
                style={PORT}
              >
                <Input />
              </Form.Item>
            </Flex>

            <Flex vertical gap={space.sm}>
              <Form.Item
                name="user"
                label={t('connection.form.user.label')}
                rules={[{ required: true }]}
                style={ITEM}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="password"
                label={t('connection.form.password.label')}
                style={ITEM}
              >
                <Input type="password" />
              </Form.Item>
            </Flex>

            <Flex align="center" justify="space-between">
              {canCancel ? (
                <Button
                  type="text"
                  size="small"
                  onClick={() => {
                    navigate(-1);
                  }}
                >
                  {t('cancel')}
                </Button>
              ) : (
                <span />
              )}

              <ActionButton htmlType="submit">
                {getSubmitButtonLabel(t, connection)}
              </ActionButton>
            </Flex>
          </Flex>
        </Form>
      </FramedRegionBody>
    </FramedRegion>
  );
}

export default ConnectionForm;
