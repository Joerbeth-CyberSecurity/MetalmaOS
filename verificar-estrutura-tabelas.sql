-- Script para verificar a estrutura das tabelas
-- Execute este script no SQL Editor do Supabase e me envie os resultados

-- 1. Verificar se a tabela justificativas_os existe e sua estrutura
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'justificativas_os'
ORDER BY ordinal_position;

-- 2. Verificar se a tabela auditoria_login existe e sua estrutura
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'auditoria_login'
ORDER BY ordinal_position;

-- 3. Verificar todas as tabelas que contêm 'auditoria' no nome
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%auditoria%';

-- 4. Verificar se existem triggers de auditoria
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%auditoria%';

-- 5. Verificar se a tabela configuracoes existe e tem a coluna tempo_tolerancia_pausa
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'configuracoes'
AND column_name = 'tempo_tolerancia_pausa';

-- 6. Verificar todas as colunas da tabela configuracoes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'configuracoes'
ORDER BY ordinal_position;
