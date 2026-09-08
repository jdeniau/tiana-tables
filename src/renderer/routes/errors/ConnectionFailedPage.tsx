import { Flex } from 'antd';
import { useRevalidator, useRouteError } from 'react-router';
import { useTranslation } from '../../../i18n';
import { isConnectionError } from '../../../sql/connectionError';
import { SqlError } from '../../../sql/errorSerializer';
import ButtonLink from '../../component/ButtonLink';
import SqlErrorComponent from '../../component/Query/SqlErrorComponent';
import { ActionButton } from '../../component/Style/ActionButton';
import {
  Centered,
  FramedRegion,
  FramedRegionBody,
  RegionDetail,
  RegionHeader,
  RegionMeta,
  RegionName,
} from '../../component/Style/Region';
import { space } from '../../theme';

/**
 * A connection that could not be opened — the reason, and the way out.
 *
 * The boundary sits on the `connections/:connectionSlug` route, so the title
 * bar and the connection tabs stay: only the workspace is replaced. Anything
 * that is not a connection failure falls back to the server's own error.
 */
export default function ConnectionFailedPage() {
  const error = useRouteError();
  const { t } = useTranslation();
  const revalidator = useRevalidator();

  if (!isConnectionError(error)) {
    return <SqlErrorComponent error={error as SqlError} />;
  }

  const { reason, host, port, timeoutMs } = error;

  return (
    <Centered>
      <FramedRegion>
        <RegionHeader>
          <RegionName>{t('connection.failed.title')}</RegionName>
        </RegionHeader>

        <FramedRegionBody>
          {/* same rhythm as the form: groups 24px apart, lines 8px within */}
          <Flex vertical gap={space.xl}>
            <Flex vertical gap={space.sm}>
              <div>
                {t('connection.failed.reason', {
                  reason,
                  seconds: Math.round(timeoutMs / 1000),
                })}
              </div>

              <RegionMeta>
                {t('connection.failed.target', { host, port })}
              </RegionMeta>

              <RegionDetail>{error.message}</RegionDetail>
            </Flex>

            <Flex align="center" justify="space-between">
              <ButtonLink type="text" size="small" to="/connect">
                {t('connection.failed.back')}
              </ButtonLink>

              <ActionButton
                loading={revalidator.state === 'loading'}
                onClick={() => {
                  // Retrying is an action, not a place to go: the URL does not
                  // change, the loaders run again. An errored route always has
                  // its loader re-run, whatever `shouldRevalidate` says (see
                  // `isNewLoader` in @remix-run/router).
                  revalidator.revalidate();
                }}
              >
                {t('connection.failed.retry')}
              </ActionButton>
            </Flex>
          </Flex>
        </FramedRegionBody>
      </FramedRegion>
    </Centered>
  );
}
