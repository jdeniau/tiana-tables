import type { ReactElement } from 'react';
import { List, Prose, RegionHead, Stage } from './Frame';
import { useText } from './text';

const CONNECTION = 'Le Fil (prod)';

function Field({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string;
  placeholder?: string;
}): ReactElement {
  return (
    <div className="field">
      <span>{label}</span>
      <span className={value ? 'input' : 'input placeholder'}>
        {value ?? placeholder}
      </span>
    </div>
  );
}

export function SshSection(): ReactElement {
  const { site, richList, app } = useText();

  return (
    <section className="region" id="ssh">
      <RegionHead name={site('ssh.title')} meta={site('ssh.meta')} />
      <div className="split wide-right">
        <Prose>
          <p className="lead">{site('ssh.lead')}</p>
          <List items={richList('ssh.items')} />
        </Prose>
        <Stage>
          <div className="window">
            <div className="panel-head">
              <span className="panel-name">
                {app('connection.form.title.create')}
              </span>
            </div>
            <div className="form">
              <Field
                label={app('connection.form.name.label')}
                value={CONNECTION}
              />
              <div className="field">
                <span>{app('connection.form.route.label')}</span>
                <span className="segmented fit">
                  <span>
                    {app('connection.form.route.option', { route: 'direct' })}
                  </span>
                  <span className="active">
                    {app('connection.form.route.option', { route: 'ssh' })}
                  </span>
                </span>
              </div>
              <p className="help">
                {app('connection.form.route.help', { route: 'ssh' })}
              </p>
              <div className="field-pair">
                <Field
                  label={app('connection.form.ssh.host.label')}
                  value="bastion.lefil.example"
                />
                <Field
                  label={app('connection.form.ssh.user.label')}
                  placeholder={app('connection.form.ssh.user.placeholder')}
                />
              </div>
              <div className="field-pair port">
                <Field
                  label={app('connection.form.host.label')}
                  value="db.internal"
                />
                <Field label={app('connection.form.port.label')} value="3306" />
              </div>
            </div>
          </div>
          <div className="window dialog">
            <h4>
              {app('connection.ssh.question.title', {
                kind: 'hostKey',
                connection: CONNECTION,
              })}
            </h4>
            <p>{app('connection.ssh.question.hostKeyHelp')}</p>
            <div className="fingerprint">
              ED25519 · SHA256:q8Ts0b3cR2vXyLmN7eJ4uWzA1HkPdF6gYi5oQtE9sU
            </div>
            <div className="btns">
              <span className="btn">
                {app('connection.ssh.question.cancel', { kind: 'hostKey' })}
              </span>
              <span className="action small">
                {app('connection.ssh.question.answer', { kind: 'hostKey' })}
              </span>
            </div>
          </div>
          <p className="caption">{site('ssh.caption')}</p>
        </Stage>
      </div>
    </section>
  );
}
