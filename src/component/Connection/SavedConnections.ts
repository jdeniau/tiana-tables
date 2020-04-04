import * as Store from 'electron-store';
import { ConnectionObject } from '.';

type StoreType = {
  [key: string]: ConnectionObject;
};

// TODO need a JSON schema validator here !
const storage = new Store<StoreType>({
  accessPropertiesByDotNotation: false, // remove this to handle "folder-like"
  name: 'connections',
});

export default storage;
