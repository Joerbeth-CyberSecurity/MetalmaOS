-- Script de teste simplificado
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se as tabelas existem
SELECT 'Verificando tabelas:' as teste;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('justificativas_os', 'auditoria_login', 'configuracoes')
ORDER BY table_name;

-- 2. Verificar estrutura da tabela auditoria_login
SELECT 'Estrutura da auditoria_login:' as teste;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'auditoria_login'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da tabela justificativas_os
SELECT 'Estrutura da justificativas_os:' as teste;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'justificativas_os'
ORDER BY ordinal_position;

-- 4. Verificar configuração tempo_tolerancia_pausa
SELECT 'Configuração tempo_tolerancia_pausa:' as teste;
SELECT chave, valor, descricao 
FROM public.configuracoes 
WHERE chave = 'tempo_tolerancia_pausa';

-- 5. Contar registros na auditoria
SELECT 'Total de registros na auditoria:' as teste;
SELECT COUNT(*) as total FROM public.auditoria_login;

-- 6. Ver alguns registros da auditoria
SELECT 'Alguns registros da auditoria:' as teste;
SELECT nome_usuario, tipo_evento, data_hora 
FROM public.auditoria_login 
ORDER BY data_hora DESC 
LIMIT 3;
