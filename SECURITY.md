# 🔒 Segurança do Sistema Metalma OS

## Visão Geral

O Sistema Metalma OS implementa múltiplas camadas de segurança para proteger contra vulnerabilidades comuns e ataques maliciosos. Este documento descreve todas as medidas de segurança implementadas.

## 🛡️ Camadas de Segurança

### 1. Headers de Segurança HTTP

#### Headers Implementados:
- **X-Frame-Options: DENY** - Previne clickjacking
- **X-Content-Type-Options: nosniff** - Previne MIME sniffing
- **X-XSS-Protection: 1; mode=block** - Proteção XSS do navegador
- **Referrer-Policy: strict-origin-when-cross-origin** - Controle de referrer
- **Permissions-Policy** - Controle de permissões do navegador
- **Content-Security-Policy** - Política de segurança de conteúdo
- **Strict-Transport-Security** - Força HTTPS

#### Configuração:
```typescript
// vite.config.ts
headers: {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}
```

### 2. Validação e Sanitização de Dados

#### Funções de Validação:
- `validateEmail()` - Validação de email com regex
- `validatePassword()` - Validação de senha com requisitos de segurança
- `validateCPF()` - Validação completa de CPF
- `validateCNPJ()` - Validação completa de CNPJ
- `sanitizeText()` - Remove caracteres perigosos
- `sanitizeHTML()` - Sanitização HTML com DOMPurify

#### Requisitos de Senha:
- Mínimo 8 caracteres
- Máximo 128 caracteres
- Pelo menos uma letra minúscula
- Pelo menos uma letra maiúscula
- Pelo menos um número
- Pelo menos um caractere especial (!@#$%^&*)

### 3. Proteção contra XSS (Cross-Site Scripting)

#### Implementações:
- Sanitização automática de entrada
- Detecção de padrões XSS
- DOMPurify para sanitização HTML
- CSP (Content Security Policy)
- Escape automático de saída

#### Padrões Detectados:
```javascript
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
```

### 4. Rate Limiting

#### Configuração:
- **Janela de tempo**: 15 minutos
- **Máximo de requisições**: 100 por janela
- **Identificação**: Por IP/usuário

#### Implementação:
```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  isAllowed(identifier: string): boolean {
    // Verificação de limite de requisições
  }
}
```

### 5. Proteção CSRF (Cross-Site Request Forgery)

#### Implementação:
- Tokens CSRF únicos por sessão
- Validação em formulários sensíveis
- Regeneração automática de tokens

### 6. Autenticação e Autorização

#### Supabase Auth:
- Autenticação JWT
- Row Level Security (RLS)
- Políticas de acesso granulares
- Sessões seguras

#### Políticas RLS:
```sql
-- Exemplo: Apenas admins podem gerenciar usuários
CREATE POLICY "Admin users can manage admins" ON public.admins 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);
```

### 7. Logs de Segurança

#### Eventos Monitorados:
- Tentativas de login/logout
- Ações administrativas
- Tentativas de XSS
- Acessos não autorizados
- Alterações em dados sensíveis
- Rate limit excedido

#### Estrutura do Log:
```typescript
interface SecurityLog {
  timestamp: string;
  event: string;
  details: any;
  userAgent: string;
  url: string;
  ipAddress?: string;
}
```

### 8. Proteção contra Ataques Específicos

#### Clickjacking:
- X-Frame-Options: DENY
- Detecção de iframe malicioso
- Redirecionamento automático

#### Timing Attacks:
- Delays aleatórios em operações sensíveis
- Proteção contra ataques de timing

#### Phishing:
- Verificação de domínios suspeitos
- Alertas de segurança

#### Eval/Function Constructor:
- Bloqueio de `eval()`
- Bloqueio de `Function` constructor
- Logs de tentativas

### 9. Configuração de Produção

#### Headers de Segurança (Netlify/Vercel):
```plaintext
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mezwwjzchbvfpptljmya.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://mezwwjzchbvfpptljmya.supabase.co; frame-ancestors 'none';
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

#### Build de Produção:
- Minificação e ofuscação de código
- Remoção de console.logs
- Chunking otimizado
- Headers de segurança

### 10. Monitoramento Contínuo

#### Verificações Automáticas:
- Monitoramento de DOM
- Detecção de scripts suspeitos
- Verificação de HTTPS
- Análise de conteúdo malicioso

#### Intervalo de Verificação:
- A cada 30 segundos
- Verificação em tempo real de mudanças no DOM
- Logs automáticos de eventos suspeitos

## 🚨 Resposta a Incidentes

### 1. Detecção de Ataque
- Logs automáticos de eventos de segurança
- Alertas em tempo real
- Bloqueio automático de IPs suspeitos

### 2. Mitigação
- Rate limiting automático
- Bloqueio de conteúdo malicioso
- Redirecionamento seguro

### 3. Recuperação
- Backup automático de dados
- Restauração de configurações seguras
- Análise pós-incidente

## 📋 Checklist de Segurança

### Pré-Deploy:
- [ ] Headers de segurança configurados
- [ ] Validação de entrada implementada
- [ ] Sanitização de dados ativa
- [ ] Rate limiting configurado
- [ ] Logs de segurança ativos
- [ ] HTTPS forçado
- [ ] CSP configurado
- [ ] Políticas RLS aplicadas

### Pós-Deploy:
- [ ] Testes de penetração realizados
- [ ] Monitoramento ativo
- [ ] Backup de segurança
- [ ] Documentação atualizada
- [ ] Equipe treinada

## 🔧 Manutenção de Segurança

### Atualizações Regulares:
- Dependências npm (semanal)
- Headers de segurança (mensal)
- Políticas de segurança (trimestral)
- Auditoria completa (anual)

### Monitoramento:
- Logs de segurança (diário)
- Alertas de segurança (tempo real)
- Relatórios de segurança (semanal)

## 📞 Contato de Segurança

Para reportar vulnerabilidades de segurança:
- Email: security@metalma.com
- Formulário: /security-report
- Telefone: (11) 99999-9999

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [React Security Best Practices](https://reactjs.org/docs/security.html)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) 