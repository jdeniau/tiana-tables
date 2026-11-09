import { app, dialog } from 'electron';
import { existsSync, readFileSync, renameSync, statSync } from 'node:fs';
import log from 'electron-log';
import { sync as writeFileAtomicSync } from 'write-file-atomic';
import { getFixedT, t } from '../i18n';
import {
  getConfigurationPath,
  getPreviousConfigurationPath,
} from './filePaths';
import { DEFAULT_LOCALE } from './locale';
import { Configuration } from './type';

type ParsedConfiguration = { config: Configuration } | { error: string };

/** The user chose to quit and fix the file: nothing may start on a blank configuration. */
export class QuitToFixConfigurationError extends Error {}

enum RecoveryChoice {
  Restore = 'restore',
  Quit = 'quit',
  Blank = 'blank',
}

/** The configuration a file's text holds, or why it holds none. */
export function parseConfiguration(text: string): ParsedConfiguration {
  if (text.trim() === '') {
    return { error: t('config.unreadable.empty') };
  }

  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch (error) {
    // V8's message holds the position, which a hand-edited file needs
    return { error: (error as Error).message };
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { error: t('config.unreadable.notAnObject') };
  }

  return { config: value as Configuration };
}

/** Keeps the text of a file read whole, so that a later unreadable one has something to come back to. */
export function savePreviousConfiguration(text: string): void {
  try {
    writeFileAtomicSync(getPreviousConfigurationPath(), text);
  } catch (error) {
    log.error('Previous configuration not saved:', error);
  }
}

function readPreviousConfiguration(): {
  text: string;
  config: Configuration;
  savedAt: Date;
} | null {
  const previousPath = getPreviousConfigurationPath();

  if (!existsSync(previousPath)) {
    return null;
  }

  const text = readFileSync(previousPath, 'utf-8');
  const parsed = parseConfiguration(text);

  if ('error' in parsed) {
    log.error('Previous configuration unreadable too:', parsed.error);

    return null;
  }

  return { text, config: parsed.config, savedAt: statSync(previousPath).mtime };
}

/**
 * Asks what to do with a configuration file that does not parse, which is never overwritten in place.
 * `null` starts on a blank configuration; quitting throws `QuitToFixConfigurationError`.
 */
export function recoverUnreadableConfiguration(
  error: string
): Configuration | null {
  const configurationPath = getConfigurationPath();
  const backupPath = `${configurationPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const previous = readPreviousConfiguration();

  log.error('Configuration file unreadable:', error);

  // the language is in the unreadable file: the previous version still names it
  const translate = getFixedT(previous?.config.locale ?? DEFAULT_LOCALE);

  const choices = [
    ...(previous ? [RecoveryChoice.Restore] : []),
    RecoveryChoice.Quit,
    RecoveryChoice.Blank,
  ];

  const response = dialog.showMessageBoxSync({
    type: 'error',
    title: translate('config.unreadable.title'),
    message: translate('config.unreadable.message', {
      path: configurationPath,
    }),
    detail: `${error}\n\n${translate('config.unreadable.detail', { backupPath })}`,
    buttons: choices.map((choice) =>
      choice === RecoveryChoice.Restore && previous
        ? translate('config.unreadable.restore', { date: previous.savedAt })
        : translate(`config.unreadable.${choice}`)
    ),
    defaultId: 0,
    cancelId: choices.indexOf(RecoveryChoice.Quit),
    noLink: true,
  });

  const choice = choices[response];

  if (choice === RecoveryChoice.Quit) {
    log.info('Quitting to let the configuration file be fixed');
    // app.exit only posts the shutdown: the startup after this call would go on, and save a blank configuration
    app.exit(0);

    throw new QuitToFixConfigurationError();
  }

  renameSync(configurationPath, backupPath);
  log.info('Unreadable configuration kept as', backupPath);

  if (choice === RecoveryChoice.Restore && previous) {
    writeFileAtomicSync(configurationPath, previous.text);

    return previous.config;
  }

  return null;
}
