import type { UpdateStatus } from '../main-process/updateCheck';
import { bindChannel } from './bindChannel';
import { UPDATE_CHANNEL } from './updateChannel';

interface Update {
  check(): Promise<UpdateStatus>;
}

export const update: Update = {
  check: bindChannel(UPDATE_CHANNEL.CHECK),
};
