import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSecurity } from '@/hooks/useSecurity';
import { logSecurityEvent } from '@/lib/security';

interface SecurityContextType {
  isSecure: boolean;
  securityChecks: () => boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const { detectXSSInput } = useSecurity();
  const [isSecure, setIsSecure] = React.useState(true);

  // Verificações de segurança
  const securityChecks = (): boolean => {
    // Verificar se está em HTTPS em produção
    if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
      logSecurityEvent('NON_HTTPS_ACCESS', {
        protocol: window.location.protocol,
        url: window.location.href
      });
      return false;
    }

    // Verificar se há scripts suspeitos
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const src = script.src;
      if (src && !src.startsWith(window.location.origin) && !src.startsWith('https://')) {
        logSecurityEvent('SUSPICIOUS_SCRIPT', { src });
        return false;
      }
    }

    return true;
  };

  // Monitoramento contínuo de segurança
  useEffect(() => {
    const checkSecurity = () => {
      const secure = securityChecks();
      setIsSecure(secure);
      
      if (!secure) {
        logSecurityEvent('SECURITY_CHECK_FAILED', {
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      }
    };

    // Verificação inicial
    checkSecurity();

    // Verificação periódica
    const interval = setInterval(checkSecurity, 30000); // A cada 30 segundos

    // Monitorar tentativas de acesso ao localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      if (key.includes('script') || key.includes('javascript')) {
        logSecurityEvent('SUSPICIOUS_LOCALSTORAGE_SET', { key, value });
        return;
      }
      originalSetItem.call(this, key, value);
    };

    // Monitorar tentativas de eval
    const originalEval = window.eval;
    window.eval = function(code: string) {
      logSecurityEvent('EVAL_ATTEMPT', { code: code.substring(0, 100) });
      throw new Error('eval() não é permitido por questões de segurança');
    };

    // Monitorar tentativas de Function constructor
    const originalFunction = window.Function;
    (window as any).Function = function(...args: string[]) {
      logSecurityEvent('FUNCTION_CONSTRUCTOR_ATTEMPT', { 
        args: args.map(arg => arg.substring(0, 50))
      });
      throw new Error('Function constructor não é permitido por questões de segurança');
    };

    return () => {
      clearInterval(interval);
      localStorage.setItem = originalSetItem;
      window.eval = originalEval;
      window.Function = originalFunction;
    };
  }, [detectXSSInput]);

  // Proteção contra ataques de clickjacking
  useEffect(() => {
    const protectAgainstClickjacking = () => {
      if (window.self !== window.top) {
        logSecurityEvent('CLICKJACKING_ATTEMPT', {
          referrer: document.referrer,
          url: window.location.href
        });
        window.top.location.href = window.location.href;
      }
    };

    protectAgainstClickjacking();
  }, []);

  // Proteção contra ataques de phishing
  useEffect(() => {
    const protectAgainstPhishing = () => {
      const suspiciousDomains = [
        'supabase.co',
        'metalma.com',
        'metalma.com.br'
      ];
      
      const currentDomain = window.location.hostname;
      const isSuspicious = !suspiciousDomains.some(domain => 
        currentDomain.includes(domain)
      );
      
      if (isSuspicious && process.env.NODE_ENV === 'production') {
        logSecurityEvent('SUSPICIOUS_DOMAIN', {
          domain: currentDomain,
          url: window.location.href
        });
      }
    };

    protectAgainstPhishing();
  }, []);

  const value: SecurityContextType = {
    isSecure,
    securityChecks
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurityContext() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurityContext deve ser usado dentro de um SecurityProvider');
  }
  return context;
} 