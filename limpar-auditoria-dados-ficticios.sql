-- Script para limpar dados fictícios da auditoria e explicar as tabelas
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. LIMPAR DADOS FICTÍCIOS DA TABELA auditoria_login
DELETE FROM public.auditoria_login 
WHERE nome_usuario IN ('João Silva', 'Maria Santos', 'Admin', 'Teste Sistema')
   OR email_usuario IN ('joao@exemplo.com', 'maria@exemplo.com', 'admin@metalma.com', 'teste@sistema.com');

-- 2. VERIFICAR E LIMPAR DADOS FICTÍCIOS DA TABELA auditoria_sistema (se existir)
-- Esta tabela é para auditoria geral do sistema (criação, edição, exclusão de registros)
-- Pode ser limpa se contiver dados de teste
DELETE FROM public.auditoria_sistema 
WHERE usuario_nome IN ('João Silva', 'Maria Santos', 'Admin', 'Teste Sistema')
   OR usuario_email IN ('joao@exemplo.com', 'maria@exemplo.com', 'admin@metalma.com', 'teste@sistema.com');

-- 3. EXPLICAÇÃO DAS TABELAS DE AUDITORIA:

-- auditoria_login: Registra apenas logins e logouts dos usuários
-- - Campos: user_id, nome_usuario, email_usuario, tipo_evento, ip_address, user_agent, data_hora
-- - Uso: Monitorar acessos ao sistema

-- auditoria_sistema: Registra todas as ações dos usuários no sistema
-- - Campos: usuario_id, usuario_nome, usuario_email, acao, tabela, registro_id, dados_anteriores, dados_novos, ip_address, user_agent, url, detalhes, created_at
-- - Uso: Auditoria completa de todas as operações (CRUD) no sistema

-- 4. VERIFICAR QUAIS DADOS RESTARAM
SELECT 'Dados restantes na auditoria_login:' as info;
SELECT COUNT(*) as total_registros FROM public.auditoria_login;

SELECT 'Dados restantes na auditoria_sistema:' as info;
SELECT COUNT(*) as total_registros FROM public.auditoria_sistema;

-- 5. MOSTRAR ESTRUTURA DAS TABELAS
SELECT 'Estrutura da tabela auditoria_login:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'auditoria_login' 
ORDER BY ordinal_position;

SELECT 'Estrutura da tabela auditoria_sistema:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'auditoria_sistema' 
ORDER BY ordinal_position;

-- 6. RECOMENDAÇÃO:
-- - Manter auditoria_login para logins/logouts
-- - Manter auditoria_sistema para auditoria completa do sistema
-- - Ambas são importantes para segurança e compliance
