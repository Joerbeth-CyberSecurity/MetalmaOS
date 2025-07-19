# Sistema de Auditoria - Setup

## 📋 O que foi implementado

### 1. **Tabela de Auditoria** (`auditoria_login`)
- Registra todos os logins e logouts
- Armazena informações do usuário, data/hora, user agent
- Políticas de segurança (apenas admins podem ver)

### 2. **Hook useAuth atualizado**
- Funções `registrarLogin()` e `registrarLogout()`
- Registro automático de eventos de autenticação

### 3. **Interface de Auditoria**
- Nova seção em **Configurações**
- Filtros por usuário, data e tipo de evento
- Exportação para CSV
- Estatísticas em tempo real

## 🚀 Como implementar

### Passo 1: Criar a tabela no banco
1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Execute o script do arquivo `auditoria_setup.sql`

### Passo 2: Testar o sistema
1. Faça login/logout no sistema
2. Vá em **Configurações** → **Auditoria de Login/Logout**
3. Verifique se os registros aparecem

## 🔧 Funcionalidades

### Filtros disponíveis:
- **Usuário**: Nome ou email
- **Data Início/Fim**: Período específico
- **Tipo de Evento**: Login ou Logout

### Relatórios:
- **Exportação CSV**: Dados completos
- **Estatísticas**: Total, logins, logouts, usuários únicos

### Segurança:
- Apenas administradores podem acessar
- Dados protegidos por RLS (Row Level Security)

## 📊 Dados coletados

Para cada login/logout:
- ✅ Nome do usuário
- ✅ Email do usuário
- ✅ Tipo de evento (login/logout)
- ✅ Data e hora exata
- ✅ User Agent (navegador/dispositivo)
- ✅ IP (preparado para futuro)

## 🎯 Próximos passos (opcionais)

1. **Captura de IP**: Implementar via Edge Functions
2. **Alertas**: Notificações para logins suspeitos
3. **Retenção**: Política de limpeza de dados antigos
4. **Dashboard**: Gráficos de acesso

---

**Status**: ✅ Implementado e pronto para uso!
**Arquivo SQL**: `auditoria_setup.sql`
**Localização**: Configurações → Auditoria de Login/Logout 