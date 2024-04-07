import { Alert, Flex, Layout } from 'antd';
import { useRouteError } from 'react-router-dom';
import { styled } from 'styled-components';
import { ConfigurationContextProvider } from '../../../contexts/ConfigurationContext';
import { ThemeContextProvider } from '../../../contexts/ThemeContext';
import { useTranslation } from '../../../i18n';
import ButtonLink from '../../../renderer/component/ButtonLink';
import { background } from '../../../renderer/theme';
import Debug from '../../component/Debug';
import { Header, RootLink } from '../root';

const Content = styled(Layout.Content)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px;
  background-color: ${background};
`;

export default function RootErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();

  console.error(error);

  return (
    <ConfigurationContextProvider>
      <ThemeContextProvider>
        <div id="error-page">
          <Layout>
            <Debug />
            <Header>
              <Flex align="center" gap="small">
                <h2>
                  <RootLink to="/">Tiana Tables</RootLink>
                </h2>
              </Flex>
            </Header>

            <Content>
              <h1>{t('errorPage.title')}</h1>
              <Alert
                showIcon
                message={t('errorPage.sorry')}
                // @ts-expect-error error might have one of those
                description={error.statusText || error.message}
                type="error"
              />

              <div>
                <ButtonLink to="/">{t('errorPage.goHome')}</ButtonLink>
              </div>
            </Content>
          </Layout>
        </div>
      </ThemeContextProvider>
    </ConfigurationContextProvider>
  );
}
