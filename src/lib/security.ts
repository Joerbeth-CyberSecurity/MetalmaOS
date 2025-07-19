import DOMPurify from 'dompurify';

/**
 * Utilitários de Segurança para o Sistema Metalma OS
 */

// Configurações de segurança
export const SECURITY_CONFIG = {
  MAX_INPUT_LENGTH: 1000,
  MAX_EMAIL_LENGTH: 100,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutos
  MAX_REQUESTS_PER_WINDOW: 100,
};

// Padrões de validação
export const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  PHONE: /^\(\d{2}\) \d{4,5}-\d{4}$/,
  CEP: /^\d{5}-\d{3}$/,
  ONLY_NUMBERS: /^\d+$/,
  ONLY_LETTERS: /^[a-zA-ZÀ-ÿ\s]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
};

/**
 * Sanitiza texto removendo caracteres perigosos
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove caracteres perigosos
  let sanitized = input
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data URLs
    .replace(/vbscript:/gi, '') // Remove VBScript
    .trim();
  
  // Limita o tamanho
  if (sanitized.length > SECURITY_CONFIG.MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, SECURITY_CONFIG.MAX_INPUT_LENGTH);
  }
  
  return sanitized;
}

/**
 * Sanitiza HTML usando DOMPurify
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const sanitized = sanitizeText(email);
  if (sanitized.length > SECURITY_CONFIG.MAX_EMAIL_LENGTH) return false;
  
  return VALIDATION_PATTERNS.EMAIL.test(sanitized);
}

/**
 * Valida senha
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Senha é obrigatória');
    return { isValid: false, errors };
  }
  
  if (password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
    errors.push(`Senha deve ter pelo menos ${SECURITY_CONFIG.MIN_PASSWORD_LENGTH} caracteres`);
  }
  
  if (password.length > SECURITY_CONFIG.MAX_PASSWORD_LENGTH) {
    errors.push(`Senha deve ter no máximo ${SECURITY_CONFIG.MAX_PASSWORD_LENGTH} caracteres`);
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  
  if (!/(?=.*[!@#$%^&*])/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial (!@#$%^&*)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valida CPF
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf || typeof cpf !== 'string') return false;
  
  const sanitized = sanitizeText(cpf);
  if (!VALIDATION_PATTERNS.CPF.test(sanitized)) return false;
  
  // Remove pontos e traços
  const numbers = sanitized.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (numbers.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numbers)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;
  
  return true;
}

/**
 * Valida CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj || typeof cnpj !== 'string') return false;
  
  const sanitized = sanitizeText(cnpj);
  if (!VALIDATION_PATTERNS.CNPJ.test(sanitized)) return false;
  
  // Remove pontos, traços e barras
  const numbers = sanitized.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (numbers.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(numbers)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(numbers[12])) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(numbers[13])) return false;
  
  return true;
}

/**
 * Rate Limiting simples em memória
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, [now]);
      return true;
    }
    
    const requests = this.requests.get(identifier)!;
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }
  
  clear() {
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Gera token CSRF
 */
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Valida token CSRF
 */
export function validateCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken && token.length > 0;
}

/**
 * Log de segurança
 */
export function logSecurityEvent(event: string, details: any = {}): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
  
  // Em produção, enviar para serviço de logs
  if (process.env.NODE_ENV === 'production') {
    console.warn('SECURITY EVENT:', logEntry);
    // TODO: Implementar envio para serviço de logs
  } else {
    console.log('SECURITY EVENT:', logEntry);
  }
}

/**
 * Detecta tentativas de XSS
 */
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validação geral de entrada
 */
export function validateInput(input: any, type: 'text' | 'email' | 'number' | 'phone' | 'cpf' | 'cnpj'): {
  isValid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitized = '';
  
  if (input === null || input === undefined) {
    errors.push('Campo é obrigatório');
    return { isValid: false, sanitized, errors };
  }
  
  const inputStr = String(input).trim();
  
  if (inputStr.length === 0) {
    errors.push('Campo é obrigatório');
    return { isValid: false, sanitized, errors };
  }
  
  // Sanitização básica
  sanitized = sanitizeText(inputStr);
  
  // Validações específicas por tipo
  switch (type) {
    case 'email':
      if (!validateEmail(sanitized)) {
        errors.push('Email inválido');
      }
      break;
    case 'number':
      if (!VALIDATION_PATTERNS.ONLY_NUMBERS.test(sanitized)) {
        errors.push('Apenas números são permitidos');
      }
      break;
    case 'phone':
      if (!VALIDATION_PATTERNS.PHONE.test(sanitized)) {
        errors.push('Telefone deve estar no formato (99) 99999-9999');
      }
      break;
    case 'cpf':
      if (!validateCPF(sanitized)) {
        errors.push('CPF inválido');
      }
      break;
    case 'cnpj':
      if (!validateCNPJ(sanitized)) {
        errors.push('CNPJ inválido');
      }
      break;
  }
  
  // Detectar XSS
  if (detectXSS(sanitized)) {
    errors.push('Conteúdo não permitido detectado');
    logSecurityEvent('XSS_ATTEMPT', { input: sanitized });
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
} 