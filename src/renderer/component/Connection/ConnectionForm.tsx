import { Button, Flex, Form, Input, InputNumber, Segmented } from 'antd';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router';
import type { EncryptedConnectionObject } from '../../../configuration/type';
import { uniqueSlug } from '../../../configuration/utils';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';
import { DatabaseEngine } from '../../../sql/engine';
import type { ConnectionObjectWithoutSlug } from '../../../sql/types';
import { space } from '../../theme';
import { ActionButton } from '../Style/ActionButton';
import {
  FramedRegion,
  FramedRegionBody,
  RegionHeader,
  RegionName,
} from '../Style/Region';
import ConnectionColorField from './ConnectionColorField';

type Props = { connection?: EncryptedConnectionObject };

function getSubmitButtonLabel(
  t: TFunction,
  connection: EncryptedConnectionObject | undefined
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

/** What a new connection starts with on each engine: its usual port and superuser. */
const DEFAULTS: Record<DatabaseEngine, { port: number; user: string }> = {
  [DatabaseEngine.MySQL]: { port: 3306, user: 'root' },
  [DatabaseEngine.PostgreSQL]: { port: 5432, user: 'postgres' },
};

/** the database every PostgreSQL server is created with */
const DEFAULT_POSTGRES_DATABASE = 'postgres';

type FormValues = ConnectionObjectWithoutSlug;

function ConnectionForm({ connection }: Props) {
  const engine = connection?.engine ?? DatabaseEngine.MySQL;
  const initialValues: FormValues = {
    name: connection?.name ?? '',
    engine,
    host: connection?.host ?? 'localhost',
    port: connection?.port ?? DEFAULTS[engine].port,
    user: connection?.user ?? DEFAULTS[engine].user,
    database: connection?.database ?? DEFAULT_POSTGRES_DATABASE,
    color: connection?.color,
    // the stored password is a ciphertext the renderer never sees in clear: left empty, it is kept as it is
    password: '',
  };

  const { t } = useTranslation();
  const { configuration, addConnectionToConfig, editConnection } =
    useConfiguration();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const chosenEngine = Form.useWatch('engine', form) ?? engine;

  // a field still holding the other engine's default follows the engine, one the user typed stays
  const followEngine = (
    changed: Partial<FormValues>,
    values: FormValues
  ): void => {
    if (changed.engine === undefined) {
      return;
    }

    const next = DEFAULTS[changed.engine];
    const previous = Object.values(DEFAULTS).filter((d) => d !== next);

    form.setFieldsValue({
      port: previous.some((d) => d.port === values.port)
        ? next.port
        : values.port,
      user: previous.some((d) => d.user === values.user)
        ? next.user
        : values.user,
    });
  };

  // on a first launch there is nowhere to go back to
  const canCancel =
    connection !== undefined ||
    Object.keys(configuration.connections).length > 0;

  const handleSubmit = (formData: FormValues): void => {
    if (connection) {
      // edit connection
      editConnection(connection.slug, formData);

      navigate('/connect');
      return;
    }

    addConnectionToConfig(formData);

    // the connection is saved under the slug of its name, and that is what the
    // route reads: `docker (dev)` lives at `/connections/docker-dev`. The
    // connections here are the ones of before the add, the same set the main
    // process resolved the slug against.
    navigate(
      `/connections/${uniqueSlug(formData.name, Object.keys(configuration.connections))}`
    );
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
          onValuesChange={followEngine}
          form={form}
        >
          {/* field groups 24px apart, fields 8px apart within a group */}
          <Flex vertical gap={space.xl}>
            {/* first, since it reconfigures what follows; the words are in the control, so no label */}
            <Form.Item name="engine" style={ITEM}>
              <Segmented
                block
                options={Object.values(DatabaseEngine).map((value) => ({
                  value,
                  label: t('connection.engine.name', { engine: value }),
                }))}
              />
            </Form.Item>

            {/* what the connection is called, and how it is marked in the frame */}
            <Flex vertical gap={space.sm}>
              <Form.Item
                name="name"
                label={t('connection.form.name.label')}
                rules={[{ required: true }]}
                style={ITEM}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="color"
                label={t('connection.form.color.label')}
                style={ITEM}
              >
                <ConnectionColorField />
              </Form.Item>
            </Flex>

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
                <InputNumber
                  min={1}
                  max={65535}
                  precision={0}
                  controls={false}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Flex>

            {/* a PostgreSQL connection opens one database, whose schemas the app browses */}
            {chosenEngine === DatabaseEngine.PostgreSQL && (
              <Form.Item
                name="database"
                label={t('connection.form.database.label')}
                rules={[{ required: true }]}
                style={ITEM}
              >
                <Input />
              </Form.Item>
            )}

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
                <Input
                  type="password"
                  placeholder={
                    connection
                      ? t('connection.form.password.placeholder')
                      : undefined
                  }
                />
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
