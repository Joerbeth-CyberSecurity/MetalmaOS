import { useState, useCallback } from 'react';
import {
  validateInput,
  validateEmail,
  validatePassword,
  validateCPF,
  validateCNPJ,
  sanitizeText,
  sanitizeHTML,
  rateLimiter,
  logSecurityEvent,
  generateCSRFToken,
  validateCSRFToken,
  detectXSS,
} from '@/lib/security';

/**
 * Hook de Segurança para Formulários
 */
export function useSecurity() {
  const [csrfToken, setCsrfToken] = useState<string>(() => generateCSRFToken());

  /**
   * Valida e sanitiza entrada de texto
   */
  const validateAndSanitize = useCallback(
    (
      input: any,
      type: 'text' | 'email' | 'number' | 'phone' | 'cpf' | 'cnpj'
    ) => {
      return validateInput(input, type);
    },
    []
  );

  /**
   * Valida email com sanitização
   */
  const validateEmailInput = useCallback((email: string) => {
    const sanitized = sanitizeText(email);
    const isValid = validateEmail(sanitized);

    if (!isValid) {
      logSecurityEvent('INVALID_EMAIL_ATTEMPT', { email: sanitized });
    }

    return { isValid, sanitized };
  }, []);

  /**
   * Valida senha com requisitos de segurança
   */
  const validatePasswordInput = useCallback((password: string) => {
    const result = validatePassword(password);

    if (!result.isValid) {
      logSecurityEvent('WEAK_PASSWORD_ATTEMPT', {
        length: password.length,
        hasLower: /[a-z]/.test(password),
        hasUpper: /[A-Z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[!@#$%^&*]/.test(password),
      });
    }

    return result;
  }, []);

  /**
   * Valida CPF
   */
  const validateCPFInput = useCallback((cpf: string) => {
    const sanitized = sanitizeText(cpf);
    const isValid = validateCPF(sanitized);

    if (!isValid) {
      logSecurityEvent('INVALID_CPF_ATTEMPT', { cpf: sanitized });
    }

    return { isValid, sanitized };
  }, []);

  /**
   * Valida CNPJ
   */
  const validateCNPJInput = useCallback((cnpj: string) => {
    const sanitized = sanitizeText(cnpj);
    const isValid = validateCNPJ(sanitized);

    if (!isValid) {
      logSecurityEvent('INVALID_CNPJ_ATTEMPT', { cnpj: sanitized });
    }

    return { isValid, sanitized };
  }, []);

  /**
   * Sanitiza HTML
   */
  const sanitizeHTMLInput = useCallback((html: string) => {
    return sanitizeHTML(html);
  }, []);

  /**
   * Verifica rate limiting
   */
  const checkRateLimit = useCallback((identifier: string) => {
    const isAllowed = rateLimiter.isAllowed(identifier);

    if (!isAllowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier });
    }

    return isAllowed;
  }, []);

  /**
   * Gera novo token CSRF
   */
  const refreshCSRFToken = useCallback(() => {
    const newToken = generateCSRFToken();
    setCsrfToken(newToken);
    return newToken;
  }, []);

  /**
   * Valida token CSRF
   */
  const validateCSRFInput = useCallback(
    (token: string) => {
      return validateCSRFToken(token, csrfToken);
    },
    [csrfToken]
  );

  /**
   * Detecta tentativas de XSS
   */
  const detectXSSInput = useCallback((input: string) => {
    const hasXSS = detectXSS(input);

    if (hasXSS) {
      logSecurityEvent('XSS_ATTEMPT_DETECTED', {
        input: input.substring(0, 100), // Log apenas os primeiros 100 chars
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }

    return hasXSS;
  }, []);

  /**
   * Validação completa de formulário
   */
  const validateForm = useCallback(
    (formData: Record<string, any>, schema: Record<string, any>) => {
      const errors: Record<string, string[]> = {};
      const sanitizedData: Record<string, any> = {};

      for (const [field, config] of Object.entries(schema)) {
        const value = formData[field];
        const validation = validateInput(value, config.type);

        if (!validation.isValid) {
          errors[field] = validation.errors;
        } else {
          sanitizedData[field] = validation.sanitized;
        }

        // Verificar XSS
        if (typeof value === 'string' && detectXSSInput(value)) {
          if (!errors[field]) errors[field] = [];
          errors[field].push('Conteúdo não permitido detectado');
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitizedData,
      };
    },
    [detectXSSInput]
  );

  /**
   * Log de tentativa de acesso não autorizado
   */
  const logUnauthorizedAccess = useCallback(
    (action: string, details: any = {}) => {
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        action,
        details,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    },
    []
  );

  /**
   * Log de ação administrativa
   */
  const logAdminAction = useCallback((action: string, details: any = {}) => {
    logSecurityEvent('ADMIN_ACTION', {
      action,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return {
    // Validações
    validateAndSanitize,
    validateEmailInput,
    validatePasswordInput,
    validateCPFInput,
    validateCNPJInput,
    validateForm,

    // Sanitização
    sanitizeHTMLInput,

    // Rate Limiting
    checkRateLimit,

    // CSRF
    csrfToken,
    refreshCSRFToken,
    validateCSRFInput,

    // XSS Detection
    detectXSSInput,

    // Logging
    logUnauthorizedAccess,
    logAdminAction,
  };
}
