// import original module declarations
import 'styled-components';
import { AppTheme } from '../configuration/themes';

// and extend them!
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends AppTheme {}
}
