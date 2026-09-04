import { Button, Form, Input } from 'antd';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router';
import { styled } from 'styled-components';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';
import type {
  ConnectionObject,
  ConnectionObjectWithoutSlug,
} from '../../../sql/types';
import { space } from '../../theme';
import { ActionLabel } from '../Style/ActionLabel';
import {
  FramedRegion,
  RegionBody,
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
const Body = styled(RegionBody)`
  padding: ${space.lg};

  label {
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

/** field groups 24px apart, fields 8px apart within a group */
const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.xl};
`;

const Group = styled.div<{ $row?: boolean }>`
  display: flex;
  flex-direction: ${({ $row }) => ($row ? 'row' : 'column')};
  gap: ${space.sm};

  > :first-child {
    flex: 1;
  }
`;

/** the group owns the spacing, so the item drops its own margin */
const Item = styled(Form.Item)`
  && {
    margin-bottom: 0;
  }
`;

const Port = styled(Item)`
  && {
    width: 96px;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

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

      <Body>
        <Form
          layout="vertical"
          requiredMark={false}
          initialValues={initialValues}
          onFinish={handleSubmit}
          form={form}
        >
          <Fields>
            <Group>
              <Item
                name="name"
                label={t('connection.form.name.label')}
                rules={[{ required: true }]}
              >
                <Input />
              </Item>
            </Group>

            <Group $row>
              <Item
                name="host"
                label={t('connection.form.host.label')}
                rules={[{ required: true }]}
              >
                <Input />
              </Item>

              <Port
                name="port"
                label={t('connection.form.port.label')}
                rules={[{ required: true }]}
              >
                <Input />
              </Port>
            </Group>

            <Group>
              <Item
                name="user"
                label={t('connection.form.user.label')}
                rules={[{ required: true }]}
              >
                <Input />
              </Item>

              <Item name="password" label={t('connection.form.password.label')}>
                <Input type="password" />
              </Item>
            </Group>

            <Actions>
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

              <Button color="primary" variant="solid" htmlType="submit">
                <ActionLabel>{getSubmitButtonLabel(t, connection)}</ActionLabel>
              </Button>
            </Actions>
          </Fields>
        </Form>
      </Body>
    </FramedRegion>
  );
}

export default ConnectionForm;
