-- Script de teste final
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar tabelas existentes
SELECT 'Tabelas existentes:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('justificativas_os', 'auditoria_login', 'configuracoes')
ORDER BY table_name;

-- 2. Verificar estrutura da auditoria_login
SELECT 'Estrutura auditoria_login:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'auditoria_login'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da justificativas_os
SELECT 'Estrutura justificativas_os:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'justificativas_os'
ORDER BY ordinal_position;

-- 4. Testar inserção na auditoria
INSERT INTO public.auditoria_login (user_id, nome_usuario, email_usuario, tipo_evento, user_agent, ip_address)
VALUES (gen_random_uuid(), 'Teste Sistema', 'teste@sistema.com', 'login', 'Test Browser', '127.0.0.1');

-- 5. Ver dados da auditoria
SELECT 'Dados da auditoria:' as info;
SELECT nome_usuario, tipo_evento, data_hora 
FROM public.auditoria_login 
ORDER BY data_hora DESC 
LIMIT 5;

-- 6. Verificar configuração
SELECT 'Configuração tempo_tolerancia_pausa:' as info;
SELECT chave, valor, descricao 
FROM public.configuracoes 
WHERE chave = 'tempo_tolerancia_pausa';

-- 7. Contar registros
SELECT 'Total de registros:' as info;
SELECT 'auditoria_login' as tabela, COUNT(*) as total FROM public.auditoria_login
UNION ALL
SELECT 'justificativas_os' as tabela, COUNT(*) as total FROM public.justificativas_os;
