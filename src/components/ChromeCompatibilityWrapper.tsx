import React, { useEffect, useState } from 'react';

interface ChromeCompatibilityWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper para resolver problemas de compatibilidade com Chrome
 * Garante que o conteúdo seja renderizado corretamente
 */
export function ChromeCompatibilityWrapper({ 
  children, 
  fallback = <div className="flex items-center justify-center min-h-screen">Carregando...</div> 
}: ChromeCompatibilityWrapperProps) {
  const [isReady, setIsReady] = useState(false);
  const [isChrome, setIsChrome] = useState(false);

  useEffect(() => {
    // Detectar se é Chrome
    const userAgent = navigator.userAgent;
    const isChromeBrowser = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
    setIsChrome(isChromeBrowser);

    // Garantir que o DOM esteja pronto
    const timer = setTimeout(() => {
      setIsReady(true);
    }, isChromeBrowser ? 50 : 0); // Pequeno delay para Chrome

    return () => clearTimeout(timer);
  }, []);

  // Para Chrome, usar um delay adicional para garantir renderização
  if (isChrome && !isReady) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
