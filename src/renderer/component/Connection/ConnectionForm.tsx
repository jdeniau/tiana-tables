import { useState } from 'react';
import {
  AutoComplete,
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Space,
  Typography,
} from 'antd';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router';
import type { EncryptedConnectionObject } from '../../../configuration/type';
import { uniqueSlug } from '../../../configuration/utils';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useTranslation } from '../../../i18n';
import {
  DatabaseEngine,
  type ServerEngine,
  isFileEngine,
  opensFile,
} from '../../../sql/engine';
import { SslMode } from '../../../sql/sslMode';
import type {
  ConnectionObjectWithoutSlug,
  FileConnection,
  ServerConnection,
} from '../../../sql/types';
import type { SshTunnel } from '../../../ssh/types';
import { space } from '../../theme';
import { ActionButton } from '../Style/ActionButton';
import {
  FramedRegion,
  FramedRegionBody,
  RegionHeader,
  RegionName,
} from '../Style/Region';
import ConnectionColorField from './ConnectionColorField';
import { groupNames } from './connectionGroups';
import { useConnectionDeletion } from './useConnectionDeletion';

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

/** What a new connection starts with on each server engine: its usual port and superuser. */
const DEFAULTS: Record<ServerEngine, { port: number; user: string }> = {
  [DatabaseEngine.MySQL]: { port: 3306, user: 'root' },
  [DatabaseEngine.PostgreSQL]: { port: 5432, user: 'postgres' },
};

/** the database every PostgreSQL server is created with */
const DEFAULT_POSTGRES_DATABASE = 'postgres';

/** How the server is reached: the SSH fields are only mounted, and so only submitted, through a tunnel. */
enum Route {
  Direct = 'direct',
  Ssh = 'ssh',
}

/** Every field the form can show: only those mounted for the chosen engine are submitted. */
type FormValues = Omit<ServerConnection, 'slug' | 'engine'> &
  Omit<FileConnection, 'slug' | 'engine'> & { engine: DatabaseEngine };

/** The label points at the input, which a compact group keeps from being the item's own control. */
const FILE_INPUT_ID = 'connection-file';

/** An emptied port reads `null`, an emptied user `''`: neither is stored, so `~/.ssh/config` decides. */
function withoutBlankSshFields({ host, port, user }: SshTunnel): SshTunnel {
  return {
    host,
    ...(port != null && { port }),
    ...(user?.trim() && { user: user.trim() }),
  };
}

/** The connection the submitted fields describe, each engine keeping its own. */
function toConnection({
  engine,
  name,
  color,
  group,
  file,
  ...server
}: FormValues): ConnectionObjectWithoutSlug {
  // a blank group is no group
  const identity = { name, color, group: group?.trim() || undefined };

  if (isFileEngine(engine)) {
    return { ...identity, engine, file };
  }

  return {
    ...server,
    ...identity,
    engine,
    ...(server.ssh && { ssh: withoutBlankSshFields(server.ssh) }),
  };
}

function ConnectionForm({ connection }: Props) {
  const engine = connection?.engine ?? DatabaseEngine.MySQL;
  const server = connection && !opensFile(connection) ? connection : undefined;
  const serverEngine = server?.engine ?? DatabaseEngine.MySQL;
  const initialValues: FormValues = {
    name: connection?.name ?? '',
    engine,
    host: server?.host ?? 'localhost',
    port: server?.port ?? DEFAULTS[serverEngine].port,
    user: server?.user ?? DEFAULTS[serverEngine].user,
    database: server?.database ?? DEFAULT_POSTGRES_DATABASE,
    ssl: server?.ssl ?? SslMode.Disable,
    color: connection?.color,
    group: connection?.group,
    ssh: server?.ssh,
    // the stored password is a ciphertext the renderer never sees in clear: left empty, it is kept as it is
    password: '',
    file: connection && opensFile(connection) ? connection.file : '',
  };

  const { t } = useTranslation();
  const { configuration, addConnectionToConfig, editConnection } =
    useConfiguration();
  const deletion = useConnectionDeletion();
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const chosenEngine = Form.useWatch('engine', form) ?? engine;
  const chosenSsl = Form.useWatch('ssl', form) ?? initialValues.ssl;
  const [route, setRoute] = useState(server?.ssh ? Route.Ssh : Route.Direct);

  // a field still holding the other engine's default follows the engine, one the user typed stays
  const followEngine = (changed: Partial<FormValues>): void => {
    if (changed.engine === undefined || isFileEngine(changed.engine)) {
      return;
    }

    const next = DEFAULTS[changed.engine];
    const previous = Object.values(DEFAULTS).filter((d) => d !== next);
    // read from the store: the values handed to `onValuesChange` leave out the fields a file engine unmounted
    const port: unknown = form.getFieldValue('port');
    const user: unknown = form.getFieldValue('user');

    form.setFieldsValue({
      ...(previous.some((d) => d.port === port) && { port: next.port }),
      ...(previous.some((d) => d.user === user) && { user: next.user }),
    });
  };

  // on a first launch there is nowhere to go back to
  const canCancel =
    connection !== undefined ||
    Object.keys(configuration.connections).length > 0;

  const browseFile = async (): Promise<void> => {
    const file = await window.config.pickDatabaseFile(
      form.getFieldValue('file') || undefined
    );

    if (file !== null) {
      form.setFields([{ name: 'file', value: file, errors: [] }]);
    }
  };

  const handleSubmit = (values: FormValues): void => {
    const formData = toConnection(values);

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

            {/* what the connection is called, how it is marked in the frame, and where it is listed */}
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

              <Form.Item
                name="group"
                label={t('connection.form.group.label')}
                style={ITEM}
              >
                <AutoComplete
                  allowClear
                  placeholder={t('connection.form.group.placeholder')}
                  options={groupNames(
                    Object.values(configuration.connections)
                  ).map((value) => ({ value }))}
                />
              </Form.Item>
            </Flex>

            {isFileEngine(chosenEngine) ? (
              <Form.Item
                label={t('connection.form.file.label')}
                htmlFor={FILE_INPUT_ID}
                style={ITEM}
              >
                <Space.Compact block>
                  <Form.Item name="file" rules={[{ required: true }]} noStyle>
                    <Input id={FILE_INPUT_ID} />
                  </Form.Item>

                  <Button onClick={() => void browseFile()}>
                    {t('connection.form.file.browse')}
                  </Button>
                </Space.Compact>
              </Form.Item>
            ) : (
              <>
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

                <Flex vertical gap={space.sm}>
                  <Form.Item
                    label={t('connection.form.route.label')}
                    extra={t('connection.form.route.help', { route })}
                    style={ITEM}
                  >
                    <Segmented
                      block
                      value={route}
                      onChange={setRoute}
                      options={Object.values(Route).map((value) => ({
                        value,
                        label: t('connection.form.route.option', {
                          route: value,
                        }),
                      }))}
                    />
                  </Form.Item>

                  {route === Route.Ssh && (
                    <>
                      <Flex gap={space.sm}>
                        <Form.Item
                          name={['ssh', 'host']}
                          label={t('connection.form.ssh.host.label')}
                          rules={[{ required: true }]}
                          style={{ ...ITEM, flex: 1 }}
                        >
                          <Input />
                        </Form.Item>

                        <Form.Item
                          name={['ssh', 'port']}
                          label={t('connection.form.port.label')}
                          style={PORT}
                        >
                          <InputNumber
                            placeholder="22"
                            min={1}
                            max={65535}
                            precision={0}
                            controls={false}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Flex>

                      <Form.Item
                        name={['ssh', 'user']}
                        label={t('connection.form.ssh.user.label')}
                        style={ITEM}
                      >
                        <Input
                          placeholder={t(
                            'connection.form.ssh.user.placeholder'
                          )}
                        />
                      </Form.Item>
                    </>
                  )}
                </Flex>

                <Form.Item
                  name="ssl"
                  label={t('connection.form.ssl.label')}
                  extra={t('connection.form.ssl.help', { mode: chosenSsl })}
                  style={ITEM}
                >
                  <Segmented
                    block
                    options={Object.values(SslMode).map((mode) => ({
                      value: mode,
                      label: t('connection.form.ssl.mode', { mode }),
                    }))}
                  />
                </Form.Item>

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
              </>
            )}

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

              <Flex gap={space.sm}>
                {connection && (
                  <Button danger onClick={deletion.askConfirmation}>
                    {t('connection.form.action.delete')}
                  </Button>
                )}

                <ActionButton htmlType="submit">
                  {getSubmitButtonLabel(t, connection)}
                </ActionButton>
              </Flex>
            </Flex>
          </Flex>
        </Form>
      </FramedRegionBody>

      {connection && (
        <Modal
          open={deletion.isConfirmOpen}
          title={t('connection.delete.title', { name: connection.name })}
          okText={t('connection.delete.confirm')}
          // Enter deletes, Escape cancels
          okButtonProps={{ danger: true, autoFocus: true }}
          cancelText={t('cancel')}
          confirmLoading={deletion.isDeleting}
          onOk={() => void deletion.confirm(connection.slug)}
          onCancel={deletion.cancel}
          destroyOnHidden
        >
          <Typography.Paragraph>
            {t('connection.delete.description')}
          </Typography.Paragraph>
        </Modal>
      )}
    </FramedRegion>
  );
}

export default ConnectionForm;
