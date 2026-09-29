import type { UpdateStatus } from '../main-process/updateStatus';
import { Unsubscribe, bindChannel, subscribe } from './bindChannel';
import { UPDATE_CHANNEL } from './updateChannel';

interface Update {
  check(): Promise<UpdateStatus>;
  restart(): Promise<void>;
  onStatusChange(callback: (status: UpdateStatus) => void): Unsubscribe;
}

export const update: Update = {
  check: bindChannel(UPDATE_CHANNEL.CHECK),
  restart: bindChannel(UPDATE_CHANNEL.RESTART),
  onStatusChange: (callback) =>
    subscribe(UPDATE_CHANNEL.STATUS_CHANGED, callback),
};
