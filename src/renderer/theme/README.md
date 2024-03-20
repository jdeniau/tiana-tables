# How to create a theme

Copy a `.tmTheme` file into the `src/renderer/theme` directory.

Then run `yarn dlx tmtheme-to-json theme-path.tmTheme`

Import the file into `src/configuration.theme.ts` and add it to the `THEME_LIST_AS_ARRAY` constant.

If it's a dark theme, then add it to the `DARK_THEME_LIST_NAME` constant too.

That's it! You can now select the theme in the settings.
