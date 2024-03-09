import { editor } from 'monaco-editor';
import {
  TmTheme,
  isDarkTheme,
  isUnscopedSetting,
} from '../../../configuration/themes';

// Taken from https://github.com/brijeshb42/monaco-themes/blob/2bf2a1f3a3a1e43e0b91c4a67376dd4051b5055d/src/index.js
// but monaco-themes needs a pList file to work
// It alse guess if the theme is dark or light, but we already have that information

function parseColor(color: string): string | null {
  if (!color.length) {
    return null;
  }

  if (color.length == 4) {
    color = color.replace(/[a-fA-F\d]/g, '$&$&');
  }

  if (color.length == 7) {
    return color;
  }

  if (color.length == 9) {
    return color; // substr(0, 7);
  } else {
    if (!color.match(/^#(..)(..)(..)(..)$/)) {
      throw new Error(`can't parse color ${color}`);
    }

    const rgba: Array<number> | undefined = color
      .match(/^#(..)(..)(..)(..)$/)
      ?.slice(1)
      .map(function (c) {
        return parseInt(c, 16);
      });

    if (!rgba) {
      throw new Error(`can't parse color ${color}`);
    }

    // @ts-expect-error string / number assignation issue, but will be joined the line after
    rgba[3] = (rgba[3] / 0xff).toPrecision(2);

    return 'rgba(' + rgba.join(', ') + ')';
  }
}

/* Mapped from vscode/src/vs/workbench/services/themes/electron-browser/themeCompatibility.ts */
const COLOR_MAP = [
  {
    tm: 'foreground',
    mn: 'editor.foreground',
  },
  {
    tm: 'background',
    mn: 'editor.background',
  },
  // {
  //   tm: 'foreground',
  //   mn: 'editorSuggestWidget.foreground',
  // },
  // {
  //   tm: 'background',
  //   mn: 'editorSuggestWidget.background',
  // },
  {
    tm: 'selection',
    mn: 'editor.selectionBackground',
  },
  {
    tm: 'inactiveSelection',
    mn: 'editor.inactiveSelectionBackground',
  },
  {
    tm: 'selectionHighlightColor',
    mn: 'editor.selectionHighlightBackground',
  },
  {
    tm: 'findMatchHighlight',
    mn: 'editor.findMatchHighlightBackground',
  },
  {
    tm: 'currentFindMatchHighlight',
    mn: 'editor.findMatchBackground',
  },
  {
    tm: 'hoverHighlight',
    mn: 'editor.hoverHighlightBackground',
  },
  {
    tm: 'wordHighlight',
    mn: 'editor.wordHighlightBackground',
  },
  {
    tm: 'wordHighlightStrong',
    mn: 'editor.wordHighlightStrongBackground',
  },
  {
    tm: 'findRangeHighlight',
    mn: 'editor.findRangeHighlightBackground',
  },
  {
    tm: 'findMatchHighlight',
    mn: 'peekViewResult.matchHighlightBackground',
  },
  {
    tm: 'referenceHighlight',
    mn: 'peekViewEditor.matchHighlightBackground',
  },
  {
    tm: 'lineHighlight',
    mn: 'editor.lineHighlightBackground',
  },
  {
    tm: 'rangeHighlight',
    mn: 'editor.rangeHighlightBackground',
  },
  {
    tm: 'caret',
    mn: 'editorCursor.foreground',
  },
  {
    tm: 'invisibles',
    mn: 'editorWhitespace.foreground',
  },
  {
    tm: 'guide',
    mn: 'editorIndentGuide.background',
  },
  {
    tm: 'activeGuide',
    mn: 'editorIndentGuide.activeBackground',
  },
  {
    tm: 'selectionBorder',
    mn: 'editor.selectionHighlightBorder',
  },
];

const ansiColorMap = [
  'ansiBlack',
  'ansiRed',
  'ansiGreen',
  'ansiYellow',
  'ansiBlue',
  'ansiMagenta',
  'ansiCyan',
  'ansiWhite',
  'ansiBrightBlack',
  'ansiBrightRed',
  'ansiBrightGreen',
  'ansiBrightYellow',
  'ansiBrightBlue',
  'ansiBrightMagenta',
  'ansiBrightCyan',
  'ansiBrightWhite',
];

ansiColorMap.forEach((color) => {
  COLOR_MAP.push({
    tm: color,
    mn: 'terminal.' + color,
  });
});
export function convertTextmateThemeToMonaco(
  rawData: TmTheme
): editor.IStandaloneThemeData {
  const firstSettings = rawData.settings[0];

  if (!isUnscopedSetting(firstSettings)) {
    throw new Error('Expected global settings in first position');
  }
  const globalSettings = firstSettings.settings;

  const rules: editor.ITokenThemeRule[] = [];

  rawData.settings.forEach((setting) => {
    if (!setting.settings) {
      return;
    }

    let scopes;

    if (typeof setting.scope === 'string') {
      scopes = setting.scope
        .replace(/^[,]+/, '')
        .replace(/[,]+$/, '')
        .split(',');
    } else if (Array.isArray(setting.scope)) {
      scopes = setting.scope;
    } else {
      scopes = [''];
    }

    const rule: Partial<editor.ITokenThemeRule> = {};
    const settings = setting.settings;

    if (settings.foreground) {
      const parsed = parseColor(settings.foreground);
      if (parsed) {
        rule.foreground = parsed.toLowerCase().replace('#', '');
      }
    }

    if (settings.background) {
      const parsed = parseColor(settings.background);
      if (parsed) {
        rule.background = parsed.toLowerCase().replace('#', '');
      }
    }

    if (settings.fontStyle && typeof settings.fontStyle === 'string') {
      rule.fontStyle = settings.fontStyle;
    }

    scopes.forEach((scope) => {
      if (!scope || !Object.keys(rule).length) {
        return;
      }
      const r = Object.assign({}, rule, {
        token: scope.trim(),
      });
      rules.push(r);
    });
  });

  const globalColors: editor.IColors = {};

  /* More properties to be added */
  COLOR_MAP.forEach((obj) => {
    const tmGlobalSetting = globalSettings[obj.tm];

    if (tmGlobalSetting) {
      const parsed = parseColor(tmGlobalSetting);

      if (parsed) {
        globalColors[obj.mn] = parsed;
      }
    }
  });

  const base = isDarkTheme(rawData) ? 'vs-dark' : 'vs';

  return {
    base,
    inherit: true,
    rules: rules,
    colors: globalColors,
  };
}
