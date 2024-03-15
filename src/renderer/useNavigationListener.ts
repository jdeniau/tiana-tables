import { useEffect } from 'react';
import { useNavigate } from 'react-router';

/**
 * Listen to navigation event from the main process and navigate to the given path.
 */
export function useNavigationListener(): void {
  const navigate = useNavigate();

  useEffect(() => {
    window.navigationListener.onNavigate((path) => {
      navigate(path);
    });
  }, [navigate]);
}
