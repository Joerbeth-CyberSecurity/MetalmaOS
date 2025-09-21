-- Script para testar se as funcionalidades estão funcionando
-- Execute este script no SQL Editor do Supabase

-- 1. Testar se a tabela justificativas_os está funcionando
SELECT 'Testando justificativas_os:' as teste;
SELECT COUNT(*) as total_justificativas FROM public.justificativas_os;

-- 2. Testar se a tabela auditoria_login está funcionando
SELECT 'Testando auditoria_login:' as teste;
SELECT COUNT(*) as total_auditoria FROM public.auditoria_login;

-- 3. Testar se a configuração tempo_tolerancia_pausa existe
SELECT 'Testando configuracoes:' as teste;
SELECT chave, valor, descricao 
FROM public.configuracoes 
WHERE chave = 'tempo_tolerancia_pausa';

-- 4. Testar inserção de dados de exemplo na auditoria
INSERT INTO public.auditoria_login (user_id, nome_usuario, email_usuario, tipo_evento, user_agent, ip_address)
VALUES 
    (gen_random_uuid(), 'Teste Sistema', 'teste@sistema.com', 'login', 'Mozilla/5.0 (Test Browser)', '127.0.0.1'),
    (gen_random_uuid(), 'Teste Sistema', 'teste@sistema.com', 'logout', 'Mozilla/5.0 (Test Browser)', '127.0.0.1')
ON CONFLICT DO NOTHING;

-- 5. Verificar se os dados foram inseridos
SELECT 'Dados inseridos na auditoria:' as teste;
SELECT nome_usuario, tipo_evento, data_hora 
FROM public.auditoria_login 
ORDER BY data_hora DESC 
LIMIT 5;

-- 6. Testar se as permissões estão funcionando
SELECT 'Testando permissões:' as teste;
SELECT table_name, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('justificativas_os', 'auditoria_login')
ORDER BY table_name, policyname;
