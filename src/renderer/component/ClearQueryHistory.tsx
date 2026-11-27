import { useState } from 'react';
import { Button, Modal, Typography } from 'antd';
import { useTranslation } from '../../i18n';

enum ClearState {
  Idle = 'idle',
  Confirming = 'confirming',
  Clearing = 'clearing',
  Cleared = 'cleared',
}

/** Forgets the statements the editor learnt its suggestions from, once confirmed. */
export default function ClearQueryHistory() {
  const { t } = useTranslation();
  const [state, setState] = useState(ClearState.Idle);

  const clear = (): void => {
    setState(ClearState.Clearing);

    window.queryHistory.clear().then(
      () => setState(ClearState.Cleared),
      (error: unknown) => {
        console.error('The query history was not cleared', error);
        setState(ClearState.Idle);
      }
    );
  };

  return (
    <>
      <Button
        danger
        disabled={state === ClearState.Cleared}
        onClick={() => setState(ClearState.Confirming)}
      >
        {state === ClearState.Cleared
          ? t('settings.queryHistory.cleared')
          : t('settings.queryHistory.clear')}
      </Button>

      <Modal
        open={state === ClearState.Confirming || state === ClearState.Clearing}
        title={t('settings.queryHistory.confirm.title')}
        okText={t('settings.queryHistory.confirm.ok')}
        // Enter clears, Escape cancels
        okButtonProps={{ danger: true, autoFocus: true }}
        cancelText={t('cancel')}
        confirmLoading={state === ClearState.Clearing}
        onOk={clear}
        onCancel={() => setState(ClearState.Idle)}
        destroyOnHidden
      >
        <Typography.Paragraph>
          {t('settings.queryHistory.confirm.description')}
        </Typography.Paragraph>
      </Modal>
    </>
  );
}
