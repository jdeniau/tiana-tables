import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useConfiguration } from '../../../contexts/ConfigurationContext';
import { useConnectionContext } from '../../../contexts/ConnectionContext';

export interface ConnectionDeletion {
  /** the confirmation is on screen */
  isConfirmOpen: boolean;
  askConfirmation: () => void;
  cancel: () => void;
  /** the deletion is confirmed and not stored yet */
  isDeleting: boolean;
  /** closes the connection if it is open, deletes it, then goes back to the list */
  confirm: (slug: string) => Promise<void>;
}

/** Deleting a connection from its form, once confirmed. */
export function useConnectionDeletion(): ConnectionDeletion {
  const { deleteConnection } = useConfiguration();
  const { connectionSlugList, closeConnection } = useConnectionContext();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirm = async (slug: string): Promise<void> => {
    setIsDeleting(true);

    // an open connection would keep its tab and its socket
    if (connectionSlugList.includes(slug)) {
      closeConnection(slug);
    }

    await deleteConnection(slug);

    navigate('/connect');
  };

  return {
    isConfirmOpen,
    askConfirmation: () => setIsConfirmOpen(true),
    cancel: () => setIsConfirmOpen(false),
    isDeleting,
    confirm,
  };
}
