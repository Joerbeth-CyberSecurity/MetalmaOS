import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook para navegação segura que resolve problemas de compatibilidade com Chrome
 * Garante que a navegação aconteça após a renderização completa
 */
export function useSafeNavigate() {
  const navigate = useNavigate();

  const safeNavigate = useCallback((path: string, delay: number = 100) => {
    // Usar requestAnimationFrame para garantir que a navegação aconteça no próximo frame
    requestAnimationFrame(() => {
      setTimeout(() => {
        navigate(path);
      }, delay);
    });
  }, [navigate]);

  const safeNavigateReplace = useCallback((path: string, delay: number = 100) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        navigate(path, { replace: true });
      }, delay);
    });
  }, [navigate]);

  return {
    navigate: safeNavigate,
    navigateReplace: safeNavigateReplace,
    // Manter o navigate original para casos que não precisam de delay
    navigateImmediate: navigate
  };
}
