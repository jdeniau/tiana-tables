import { active4d } from './palettes/active4d';
import { catppuccinLatte } from './palettes/catppuccinLatte';
import { catppuccinMocha } from './palettes/catppuccinMocha';
import { dracula } from './palettes/dracula';
import { eva } from './palettes/eva';
import { github } from './palettes/github';
import { githubDark } from './palettes/githubDark';
import { gruvboxDarkMedium } from './palettes/gruvboxDarkMedium';
import { gruvboxLightMedium } from './palettes/gruvboxLightMedium';
import { monokai } from './palettes/monokai';
import { nightOwl } from './palettes/nightOwl';
import { nord } from './palettes/nord';
import { oneLight } from './palettes/oneLight';
import { onedark } from './palettes/onedark';
import { outrunDark } from './palettes/outrunDark';
import { rosePine } from './palettes/rosePine';
import { rosePineDawn } from './palettes/rosePineDawn';
import { solarizedDark } from './palettes/solarizedDark';
import { solarizedLight } from './palettes/solarizedLight';
import { synthMidnight } from './palettes/synthMidnight';
import { synthwave84 } from './palettes/synthwave84';
import { tokyoNightDark } from './palettes/tokyoNightDark';
import { tokyoNightLight } from './palettes/tokyoNightLight';
import { AppTheme } from './palettes/types';
import { unikittyLight } from './palettes/unikittyLight';
import { visualStudio } from './palettes/visualStudio';

export type { AppTheme } from './palettes/types';

const THEME_LIST_AS_ARRAY: AppTheme[] = [
  // the default theme comes first
  dracula,
  active4d,
  catppuccinLatte,
  catppuccinMocha,
  eva,
  github,
  githubDark,
  gruvboxDarkMedium,
  gruvboxLightMedium,
  monokai,
  nightOwl,
  nord,
  onedark,
  oneLight,
  outrunDark,
  rosePine,
  rosePineDawn,
  solarizedDark,
  solarizedLight,
  synthMidnight,
  synthwave84,
  tokyoNightDark,
  tokyoNightLight,
  unikittyLight,
  visualStudio,
];

export const THEME_LIST: Record<string, AppTheme> = {};
THEME_LIST_AS_ARRAY.forEach((theme) => {
  THEME_LIST[theme.name] = theme;
});

export const DEFAULT_THEME = THEME_LIST_AS_ARRAY[0];

export function isDarkTheme(theme: AppTheme): boolean {
  return theme.variant === 'dark';
}
