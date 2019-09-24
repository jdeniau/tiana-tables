import * as React from 'react';
import { configure, addParameters, addDecorator } from '@storybook/react';
import { makeDecorator } from '@storybook/addons';
import { themes } from '@storybook/theming';
import styled, { ThemeProvider } from 'styled-components';
import { DEFAULT_THEME, getSetting } from '../src/theme';

// automatically import all files ending in *.stories.tsx
const req = require.context('../stories', true, /\.stories\.tsx$/);

function loadStories() {
  req.keys().forEach(req);
}

const LayoutDiv = styled.div`
  background: ${props => getSetting(props.theme, 'background')};
  color: ${props => getSetting(props.theme, 'foreground')};
  min-height: calc(100vh - 16px);
`;

addDecorator(
  makeDecorator({
    name: 'withMyTheme',
    parameterName: 'myTheme',
    wrapper: (getStory, context) => {
      return (
        <ThemeProvider theme={DEFAULT_THEME}>
          <LayoutDiv>{getStory(context)}</LayoutDiv>
        </ThemeProvider>
      );
    },
  })
);

addParameters({
  options: {
    theme: themes.normal,
  },
});

configure(loadStories, module);
