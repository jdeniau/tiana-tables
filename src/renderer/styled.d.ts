// import original module declarations
import 'styled-components';
import { TmTheme } from '../configuration/themes';

// and extend them!
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends TmTheme {}
}
